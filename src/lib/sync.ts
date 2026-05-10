// Debounced sync from local IndexedDB → Supabase.
// Strategy: last-write-wins per row. On hydrate, pull server state if newer.
// Silently no-ops when Supabase isn't configured.

import { supabase, isCloudSyncEnabled } from "./supabase";
import { localDb } from "./storage";
import type { LearnerIdentity } from "./identity";

const DEBOUNCE_MS = 3000;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

export function scheduleSync() {
  if (!isCloudSyncEnabled) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void runSync(); }, DEBOUNCE_MS);
}

async function runSync() {
  if (!supabase || inFlight) return;
  const identity = await localDb.getIdentity();
  if (!identity) return;
  inFlight = true;
  try {
    const [meta, progress, xpEvents, badges, flashcards, conceptMaps, labArtifacts, capstone] = await Promise.all([
      localDb.getMeta(),
      localDb.getProgress(),
      localDb.getXpEvents(),
      localDb.getBadges(),
      localDb.getFlashcards(),
      localDb.getConceptMaps(),
      localDb.getLabArtifacts(),
      localDb.getCapstone(),
    ]);

    const now = new Date().toISOString();

    // Upsert learner row.
    await supabase.from("learners").upsert({
      id: identity.learnerId,
      recovery_code: identity.recoveryCode,
      display_name: identity.displayName,
      role: meta.role ?? null,
      community_scenario: meta.communityScenario ?? null,
      leaderboard_opt_in: meta.leaderboardOptIn,
      updated_at: now,
    });

    const lessonRows = Object.values(progress).map((p) => ({
      learner_id: identity.learnerId,
      lesson_id: p.lessonId,
      status: p.status,
      pacer_action_done: p.pacerActionDone,
      quiz_best_score: p.quizBestScore ?? null,
      quiz_attempts: p.quizAttempts,
      completed_at: p.completedAt ?? null,
      updated_at: p.updatedAt,
    }));
    if (lessonRows.length) await supabase.from("lesson_progress").upsert(lessonRows);

    if (xpEvents.length) {
      // XP events are append-only; insert any not yet on the server.
      // For MVP simplicity: do an insert with on-conflict-do-nothing on (id).
      await supabase.from("xp_events").upsert(
        xpEvents.map((e) => ({
          id: e.id,
          learner_id: identity.learnerId,
          source_type: e.sourceType,
          source_id: e.sourceId,
          xp: e.xp,
          created_at: e.createdAt,
        })),
        { onConflict: "id", ignoreDuplicates: true } as any
      );
    }

    if (badges.length) {
      await supabase.from("learner_badges").upsert(
        badges.map((b) => ({ learner_id: identity.learnerId, badge_id: b }))
      );
    }

    const fcRows = Object.values(flashcards).map((f) => ({
      learner_id: identity.learnerId,
      card_id: f.cardId,
      ease: f.ease,
      interval_days: f.intervalDays,
      due_on: f.dueOn,
      last_grade: f.lastGrade ?? null,
    }));
    if (fcRows.length) await supabase.from("flashcard_state").upsert(fcRows);

    const cmRows = Object.values(conceptMaps).map((c) => ({
      learner_id: identity.learnerId,
      map_id: c.mapId,
      payload: c.payload,
      submitted_at: c.submittedAt ?? null,
      updated_at: c.updatedAt,
    }));
    if (cmRows.length) await supabase.from("concept_maps").upsert(cmRows, { onConflict: "learner_id,map_id" } as any);

    const labRows = Object.values(labArtifacts).map((a) => ({
      id: a.id,
      learner_id: identity.learnerId,
      lab_id: a.labId,
      payload: a.payload,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
    }));
    if (labRows.length) await supabase.from("lab_artifacts").upsert(labRows);

    if (Object.keys(capstone).length) {
      await supabase.from("capstone_progress").upsert({
        learner_id: identity.learnerId,
        sections: capstone,
        updated_at: now,
      });
    }

    await localDb.setMeta({ ...meta, lastSyncedAt: now });
  } catch (err) {
    // Sync failures are non-fatal — local state is the source of truth.
    console.warn("[sync] failed:", err);
  } finally {
    inFlight = false;
  }
}

// Restore a learner's full snapshot from Supabase using their recovery code.
// Returns the hydrated identity if found, or null otherwise.
//
// Uses the SECURITY DEFINER RPC `restore_by_code` instead of a direct SELECT,
// because the `learners` table denies SELECT to anon — the recovery_code column
// is the auth credential and must not be enumerable.
export async function restoreFromRecoveryCode(code: string): Promise<LearnerIdentity | null> {
  if (!supabase) return null;
  const trimmed = code.trim().toLowerCase();
  const { data, error } = await supabase.rpc("restore_by_code", { code: trimmed });
  if (error) {
    console.warn("[restore] rpc failed:", error);
    return null;
  }
  const learner = Array.isArray(data) ? data[0] : data;
  if (!learner) return null;

  const lid = learner.id as string;
  const [progress, xp, badges, fc, cm, la, cap] = await Promise.all([
    supabase.from("lesson_progress").select("*").eq("learner_id", lid),
    supabase.from("xp_events").select("*").eq("learner_id", lid),
    supabase.from("learner_badges").select("badge_id").eq("learner_id", lid),
    supabase.from("flashcard_state").select("*").eq("learner_id", lid),
    supabase.from("concept_maps").select("*").eq("learner_id", lid),
    supabase.from("lab_artifacts").select("*").eq("learner_id", lid),
    supabase.from("capstone_progress").select("*").eq("learner_id", lid).maybeSingle(),
  ]);

  const identity: LearnerIdentity = {
    learnerId: lid,
    recoveryCode: learner.recovery_code,
    displayName: learner.display_name,
    createdAt: learner.created_at,
  };

  await localDb.setIdentity(identity);
  await localDb.setMeta({
    role: learner.role ?? undefined,
    communityScenario: learner.community_scenario ?? undefined,
    leaderboardOptIn: learner.leaderboard_opt_in,
    lastSyncedAt: new Date().toISOString(),
  });

  const progMap: Record<string, any> = {};
  for (const r of progress.data ?? []) {
    progMap[r.lesson_id] = {
      lessonId: r.lesson_id,
      status: r.status,
      pacerActionDone: r.pacer_action_done,
      quizBestScore: r.quiz_best_score ?? undefined,
      quizAttempts: r.quiz_attempts,
      completedAt: r.completed_at ?? undefined,
      updatedAt: r.updated_at,
    };
  }
  await localDb.setProgress(progMap);

  await localDb.setXpEvents(
    (xp.data ?? []).map((e: any) => ({
      id: e.id,
      sourceType: e.source_type,
      sourceId: e.source_id,
      xp: e.xp,
      createdAt: e.created_at,
    }))
  );

  await localDb.setBadges((badges.data ?? []).map((b: any) => b.badge_id));

  const fcMap: Record<string, any> = {};
  for (const r of fc.data ?? []) {
    fcMap[r.card_id] = {
      cardId: r.card_id,
      ease: Number(r.ease),
      intervalDays: r.interval_days,
      dueOn: r.due_on,
      lastGrade: r.last_grade ?? undefined,
    };
  }
  await localDb.setFlashcards(fcMap);

  const cmMap: Record<string, any> = {};
  for (const r of cm.data ?? []) {
    cmMap[r.map_id] = {
      mapId: r.map_id,
      payload: r.payload,
      submittedAt: r.submitted_at ?? undefined,
      updatedAt: r.updated_at,
    };
  }
  await localDb.setConceptMaps(cmMap);

  const laMap: Record<string, any> = {};
  for (const r of la.data ?? []) {
    laMap[r.id] = {
      id: r.id,
      labId: r.lab_id,
      payload: r.payload,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
  await localDb.setLabArtifacts(laMap);

  if (cap.data?.sections) await localDb.setCapstone(cap.data.sections);

  return identity;
}
