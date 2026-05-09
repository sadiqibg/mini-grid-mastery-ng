"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { newLearnerIdentity, type LearnerIdentity } from "./identity";
import {
  localDb,
  type LessonProgress,
  type XpEvent,
  type FlashcardState,
  type ConceptMapAttempt,
  type LabArtifact,
  type CapstoneSectionState,
  type Meta,
} from "./storage";
import { XP_VALUES, type XpSource, MODULES_IN_ORDER, rankFor } from "./xp";
import { evaluateBadges, type BadgeId } from "./badges";
import { reviewCard, isDue } from "./srs";
import { scheduleSync } from "./sync";
import { isCloudSyncEnabled } from "./supabase";

type State = {
  ready: boolean;
  identity: LearnerIdentity | null;
  meta: Meta;
  progress: Record<string, LessonProgress>;
  xpEvents: XpEvent[];
  badges: BadgeId[];
  flashcards: Record<string, FlashcardState>;
  conceptMaps: Record<string, ConceptMapAttempt>;
  labArtifacts: Record<string, LabArtifact>;
  capstone: Record<string, CapstoneSectionState>;
  showRecoveryModal: boolean;

  init: () => Promise<void>;
  resetAll: () => Promise<void>;
  setMeta: (patch: Partial<Meta>) => Promise<void>;
  acknowledgeRecoveryCode: () => void;

  startLesson: (lessonId: string) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  markPacerDone: (lessonId: string) => Promise<void>;
  recordQuiz: (lessonId: string, score: number, masteryThreshold: number) => Promise<{ passed: boolean; improved: boolean }>;

  awardXp: (source: XpSource, sourceId: string) => Promise<void>;

  saveLabArtifact: (labId: LabArtifact["labId"], payload: Record<string, unknown>) => Promise<LabArtifact>;
  getLatestLabArtifact: (labId: LabArtifact["labId"]) => LabArtifact | undefined;

  saveConceptMap: (mapId: string, payload: ConceptMapAttempt["payload"], submit: boolean) => Promise<void>;

  reviewFlashcard: (cardId: string, grade: 0 | 1 | 2 | 3) => Promise<void>;
  dueCards: (cardIds: string[]) => string[];

  setCapstoneSection: (sectionId: string, status: CapstoneSectionState["status"]) => Promise<void>;

  totalXp: () => number;
  rank: () => ReturnType<typeof rankFor>;
  completedModules: () => Set<string>;
  isModuleUnlocked: (moduleSlug: string) => boolean;
  isCloudSyncEnabled: boolean;
};

const persist = async (
  set: (partial: Partial<State>) => void,
  get: () => State,
  patch: Partial<State>,
  writes: Array<() => Promise<unknown>>
) => {
  set(patch);
  await Promise.all(writes.map((w) => w()));
  // Re-evaluate badges after every write.
  const s = get();
  const earned = evaluateBadges({
    progress: s.progress,
    labArtifacts: s.labArtifacts,
    conceptMaps: s.conceptMaps,
    capstone: s.capstone,
  });
  if (earned.length !== s.badges.length || earned.some((b) => !s.badges.includes(b))) {
    set({ badges: earned });
    await localDb.setBadges(earned);
  }
  scheduleSync();
};

export const useStore = create<State>((set, get) => ({
  ready: false,
  identity: null,
  meta: { leaderboardOptIn: true },
  progress: {},
  xpEvents: [],
  badges: [],
  flashcards: {},
  conceptMaps: {},
  labArtifacts: {},
  capstone: {},
  showRecoveryModal: false,
  isCloudSyncEnabled,

  init: async () => {
    if (typeof window === "undefined") return;
    let identity = await localDb.getIdentity();
    let isNew = false;
    if (!identity) {
      identity = newLearnerIdentity();
      await localDb.setIdentity(identity);
      isNew = true;
    }
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
    set({
      ready: true,
      identity,
      meta,
      progress,
      xpEvents,
      badges: badges as BadgeId[],
      flashcards,
      conceptMaps,
      labArtifacts,
      capstone,
      showRecoveryModal: isNew,
    });
    if (isNew) scheduleSync();
  },

  resetAll: async () => {
    await localDb.resetAll();
    set({
      ready: false,
      identity: null,
      meta: { leaderboardOptIn: true },
      progress: {},
      xpEvents: [],
      badges: [],
      flashcards: {},
      conceptMaps: {},
      labArtifacts: {},
      capstone: {},
      showRecoveryModal: false,
    });
    await get().init();
  },

  setMeta: async (patch) => {
    const meta = { ...get().meta, ...patch };
    await persist(set, get, { meta }, [() => localDb.setMeta(meta)]);
  },

  acknowledgeRecoveryCode: () => set({ showRecoveryModal: false }),

  startLesson: async (lessonId) => {
    const progress = { ...get().progress };
    if (!progress[lessonId] || progress[lessonId].status === "unlocked") {
      progress[lessonId] = {
        lessonId,
        status: "in_progress",
        pacerActionDone: progress[lessonId]?.pacerActionDone ?? false,
        quizAttempts: progress[lessonId]?.quizAttempts ?? 0,
        quizBestScore: progress[lessonId]?.quizBestScore,
        updatedAt: new Date().toISOString(),
      };
      await persist(set, get, { progress }, [() => localDb.setProgress(progress)]);
    }
  },

  completeLesson: async (lessonId) => {
    const progress = { ...get().progress };
    const prior = progress[lessonId];
    const wasComplete = prior?.status === "completed" || prior?.status === "mastered";
    progress[lessonId] = {
      lessonId,
      status: "completed",
      pacerActionDone: prior?.pacerActionDone ?? false,
      quizAttempts: prior?.quizAttempts ?? 0,
      quizBestScore: prior?.quizBestScore,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await persist(set, get, { progress }, [() => localDb.setProgress(progress)]);
    if (!wasComplete) await get().awardXp("lessonComplete", lessonId);
  },

  markPacerDone: async (lessonId) => {
    const progress = { ...get().progress };
    const prior = progress[lessonId];
    if (prior?.pacerActionDone) return;
    progress[lessonId] = {
      lessonId,
      status: prior?.status ?? "in_progress",
      pacerActionDone: true,
      quizAttempts: prior?.quizAttempts ?? 0,
      quizBestScore: prior?.quizBestScore,
      completedAt: prior?.completedAt,
      updatedAt: new Date().toISOString(),
    };
    await persist(set, get, { progress }, [() => localDb.setProgress(progress)]);
    await get().awardXp("pacerDone", lessonId);
  },

  recordQuiz: async (lessonId, score, masteryThreshold) => {
    const progress = { ...get().progress };
    const prior = progress[lessonId];
    const previousBest = prior?.quizBestScore ?? 0;
    const passedNow = score >= masteryThreshold;
    const passedBefore = previousBest >= masteryThreshold;
    const newBest = Math.max(previousBest, score);
    const status: LessonProgress["status"] = passedNow || passedBefore
      ? (newBest >= 95 ? "mastered" : "completed")
      : prior?.status ?? "in_progress";
    progress[lessonId] = {
      lessonId,
      status,
      pacerActionDone: prior?.pacerActionDone ?? false,
      quizAttempts: (prior?.quizAttempts ?? 0) + 1,
      quizBestScore: newBest,
      completedAt: status === "completed" || status === "mastered" ? (prior?.completedAt ?? new Date().toISOString()) : prior?.completedAt,
      updatedAt: new Date().toISOString(),
    };
    await persist(set, get, { progress }, [() => localDb.setProgress(progress)]);
    if (passedNow && !passedBefore) {
      await get().awardXp("quizPass", lessonId);
      if (status === "completed" || status === "mastered") {
        // Award lesson completion XP exactly once.
        if (!prior?.completedAt) await get().awardXp("lessonComplete", lessonId);
      }
    } else if (!passedNow && (prior?.quizAttempts ?? 0) > 0 && score > previousBest) {
      await get().awardXp("quizImprove", lessonId);
    }
    return { passed: passedNow, improved: score > previousBest };
  },

  awardXp: async (source, sourceId) => {
    const event: XpEvent = {
      id: uuidv4(),
      sourceType: source === "lessonComplete" ? "lesson"
        : source === "pacerDone" ? "pacer"
        : source === "labArtifact" ? "lab"
        : source === "quizPass" || source === "quizImprove" ? "quiz"
        : source === "conceptMap" ? "concept-map"
        : source === "capstoneMilestone" ? "capstone"
        : "flashcard",
      sourceId,
      xp: XP_VALUES[source],
      createdAt: new Date().toISOString(),
    };
    const xpEvents = [...get().xpEvents, event];
    await persist(set, get, { xpEvents }, [() => localDb.setXpEvents(xpEvents)]);
  },

  saveLabArtifact: async (labId, payload) => {
    const existing = Object.values(get().labArtifacts).find((a) => a.labId === labId);
    const now = new Date().toISOString();
    const artifact: LabArtifact = existing
      ? { ...existing, payload, updatedAt: now }
      : { id: uuidv4(), labId, payload, createdAt: now, updatedAt: now };
    const labArtifacts = { ...get().labArtifacts, [artifact.id]: artifact };
    await persist(set, get, { labArtifacts }, [() => localDb.setLabArtifacts(labArtifacts)]);
    if (!existing) await get().awardXp("labArtifact", labId);
    return artifact;
  },

  getLatestLabArtifact: (labId) => {
    const list = Object.values(get().labArtifacts).filter((a) => a.labId === labId);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  },

  saveConceptMap: async (mapId, payload, submit) => {
    const prior = get().conceptMaps[mapId];
    const now = new Date().toISOString();
    const attempt: ConceptMapAttempt = {
      mapId,
      payload,
      submittedAt: prior?.submittedAt ?? (submit ? now : undefined),
      updatedAt: now,
    };
    const conceptMaps = { ...get().conceptMaps, [mapId]: attempt };
    await persist(set, get, { conceptMaps }, [() => localDb.setConceptMaps(conceptMaps)]);
    if (submit && !prior?.submittedAt) await get().awardXp("conceptMap", mapId);
  },

  reviewFlashcard: async (cardId, grade) => {
    const prev = get().flashcards[cardId];
    const next = reviewCard(prev, grade, cardId);
    const flashcards = { ...get().flashcards, [cardId]: next };
    await persist(set, get, { flashcards }, [() => localDb.setFlashcards(flashcards)]);
  },

  dueCards: (cardIds) => {
    const fc = get().flashcards;
    return cardIds.filter((id) => isDue(fc[id]));
  },

  setCapstoneSection: async (sectionId, status) => {
    const prior = get().capstone[sectionId];
    const wasComplete = prior?.status === "complete";
    const capstone = {
      ...get().capstone,
      [sectionId]: { status, updatedAt: new Date().toISOString() },
    };
    await persist(set, get, { capstone }, [() => localDb.setCapstone(capstone)]);
    if (status === "complete" && !wasComplete) {
      await get().awardXp("capstoneMilestone", sectionId);
    }
  },

  totalXp: () => get().xpEvents.reduce((sum, e) => sum + e.xp, 0),

  rank: () => rankFor(get().completedModules()),

  completedModules: () => {
    const completed = new Set<string>();
    for (const slug of MODULES_IN_ORDER) {
      // Module is "completed" when it has any lessons and they're all completed/mastered.
      // For modules without authored lessons yet, leave incomplete.
      const lessons = Object.values(get().progress).filter((p) => p.lessonId.startsWith(`lesson-${slug.split("-")[0]}-`));
      if (lessons.length > 0 && lessons.every((p) => p.status === "completed" || p.status === "mastered")) {
        completed.add(slug);
      }
    }
    return completed;
  },

  isModuleUnlocked: (moduleSlug) => {
    const idx = MODULES_IN_ORDER.indexOf(moduleSlug as any);
    if (idx <= 0) return true; // onboarding always open
    const prior = MODULES_IN_ORDER[idx - 1];
    return get().completedModules().has(prior);
  },
}));
