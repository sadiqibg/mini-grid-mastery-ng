// IndexedDB-backed local storage via idb-keyval. Single source of truth on the client.
// Server (Supabase) sync happens elsewhere in src/lib/sync.ts.

import { get, set, del } from "idb-keyval";
import type { LearnerIdentity } from "./identity";

const KEY = {
  identity: "mgm.identity",
  progress: "mgm.lessonProgress",
  xpEvents: "mgm.xpEvents",
  badges: "mgm.badges",
  flashcards: "mgm.flashcards",
  conceptMaps: "mgm.conceptMaps",
  labArtifacts: "mgm.labArtifacts",
  capstone: "mgm.capstoneSections",
  meta: "mgm.meta",
};

export type LessonProgress = {
  lessonId: string;
  status: "unlocked" | "in_progress" | "completed" | "mastered";
  pacerActionDone: boolean;
  quizBestScore?: number;
  quizAttempts: number;
  completedAt?: string;
  updatedAt: string;
};

export type XpEvent = {
  id: string;
  sourceType: "lesson" | "quiz" | "lab" | "badge" | "capstone" | "concept-map" | "pacer" | "flashcard";
  sourceId: string;
  xp: number;
  createdAt: string;
};

export type FlashcardState = {
  cardId: string;
  ease: number;
  intervalDays: number;
  dueOn: string; // ISO date
  lastGrade?: 0 | 1 | 2 | 3;
};

export type ConceptMapAttempt = {
  mapId: string;
  payload: { nodes: Array<{ id: string; label: string; x: number; y: number; custom?: boolean }>; edges: Array<{ from: string; to: string; label: string }> };
  submittedAt?: string;
  updatedAt: string;
};

export type LabArtifact = {
  id: string;
  labId: "load-survey" | "pv-sizing" | "regulatory-tree";
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CapstoneSectionState = {
  status: "not_started" | "drafting" | "complete";
  updatedAt: string;
};

export type Meta = {
  lastSyncedAt?: string;
  leaderboardOptIn: boolean;
  role?: "beginner" | "developer" | "technical" | "finance";
  communityScenario?: string;
};

const defaultMeta: Meta = { leaderboardOptIn: true };

export const localDb = {
  async getIdentity(): Promise<LearnerIdentity | undefined> { return get(KEY.identity); },
  async setIdentity(v: LearnerIdentity) { return set(KEY.identity, v); },
  async clearIdentity() { return del(KEY.identity); },

  async getProgress(): Promise<Record<string, LessonProgress>> { return (await get(KEY.progress)) ?? {}; },
  async setProgress(v: Record<string, LessonProgress>) { return set(KEY.progress, v); },

  async getXpEvents(): Promise<XpEvent[]> { return (await get(KEY.xpEvents)) ?? []; },
  async setXpEvents(v: XpEvent[]) { return set(KEY.xpEvents, v); },

  async getBadges(): Promise<string[]> { return (await get(KEY.badges)) ?? []; },
  async setBadges(v: string[]) { return set(KEY.badges, v); },

  async getFlashcards(): Promise<Record<string, FlashcardState>> { return (await get(KEY.flashcards)) ?? {}; },
  async setFlashcards(v: Record<string, FlashcardState>) { return set(KEY.flashcards, v); },

  async getConceptMaps(): Promise<Record<string, ConceptMapAttempt>> { return (await get(KEY.conceptMaps)) ?? {}; },
  async setConceptMaps(v: Record<string, ConceptMapAttempt>) { return set(KEY.conceptMaps, v); },

  async getLabArtifacts(): Promise<Record<string, LabArtifact>> { return (await get(KEY.labArtifacts)) ?? {}; },
  async setLabArtifacts(v: Record<string, LabArtifact>) { return set(KEY.labArtifacts, v); },

  async getCapstone(): Promise<Record<string, CapstoneSectionState>> { return (await get(KEY.capstone)) ?? {}; },
  async setCapstone(v: Record<string, CapstoneSectionState>) { return set(KEY.capstone, v); },

  async getMeta(): Promise<Meta> { return (await get(KEY.meta)) ?? defaultMeta; },
  async setMeta(v: Meta) { return set(KEY.meta, v); },

  async resetAll() {
    await Promise.all(Object.values(KEY).map((k) => del(k)));
  },
};
