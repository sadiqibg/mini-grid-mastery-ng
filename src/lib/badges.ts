// Badge rule engine. Pure function over a learner snapshot.
// Add rules here as features land; the store calls evaluate() after every progress write.

import type { LessonProgress, LabArtifact, ConceptMapAttempt } from "./storage";

export type BadgeId =
  | "nesi-explorer"
  | "load-profile-builder"
  | "pv-datasheet-reader"
  | "mppt-master"
  | "sld-interpreter"
  | "boq-completeness-champion"
  | "nemsa-safety-ready"
  | "soncap-procurement-aware"
  | "hca-community-champion"
  | "tariff-model-thinker"
  | "dares-funding-scout"
  | "capstone-defender";

export type BadgeDef = { id: BadgeId; label: string; description: string };

export const BADGES: BadgeDef[] = [
  { id: "nesi-explorer", label: "NESI Explorer", description: "Completed Module 1 — Nigeria Electricity System." },
  { id: "load-profile-builder", label: "Load Profile Builder", description: "Submitted a Load Survey artifact." },
  { id: "pv-datasheet-reader", label: "PV Datasheet Reader", description: "Completed Module 3 PV components lessons." },
  { id: "mppt-master", label: "MPPT Master", description: "Submitted a PV Sizing artifact." },
  { id: "sld-interpreter", label: "SLD Interpreter", description: "Completed all Module 4 lessons." },
  { id: "boq-completeness-champion", label: "BoQ Completeness Champion", description: "Reserved for v2 BoQ Builder." },
  { id: "nemsa-safety-ready", label: "NEMSA Safety Ready", description: "Completed Module 5 lessons." },
  { id: "soncap-procurement-aware", label: "SONCAP Procurement Aware", description: "Submitted a Regulatory Decision Tree artifact." },
  { id: "hca-community-champion", label: "HCA Community Champion", description: "Reserved for v2 community engagement lab." },
  { id: "tariff-model-thinker", label: "Tariff Model Thinker", description: "Reserved for v2 Tariff/LCoE Workbench." },
  { id: "dares-funding-scout", label: "DARES Funding Scout", description: "Completed Module 6 finance lessons." },
  { id: "capstone-defender", label: "Capstone Defender", description: "Marked all 22 capstone sections complete." },
];

type Snapshot = {
  progress: Record<string, LessonProgress>;
  labArtifacts: Record<string, LabArtifact>;
  conceptMaps: Record<string, ConceptMapAttempt>;
  capstone: Record<string, { status: string }>;
};

const moduleCompleted = (snap: Snapshot, modulePrefix: string) => {
  const lessons = Object.values(snap.progress).filter((p) => p.lessonId.startsWith(modulePrefix));
  return lessons.length > 0 && lessons.every((p) => p.status === "completed" || p.status === "mastered");
};

const hasArtifact = (snap: Snapshot, labId: LabArtifact["labId"]) =>
  Object.values(snap.labArtifacts).some((a) => a.labId === labId);

export function evaluateBadges(snap: Snapshot): BadgeId[] {
  const earned = new Set<BadgeId>();
  if (moduleCompleted(snap, "lesson-1-")) earned.add("nesi-explorer");
  if (hasArtifact(snap, "load-survey")) earned.add("load-profile-builder");
  if (moduleCompleted(snap, "lesson-3-")) earned.add("pv-datasheet-reader");
  if (hasArtifact(snap, "pv-sizing")) earned.add("mppt-master");
  if (moduleCompleted(snap, "lesson-4-")) earned.add("sld-interpreter");
  if (moduleCompleted(snap, "lesson-5-")) earned.add("nemsa-safety-ready");
  if (hasArtifact(snap, "regulatory-tree")) earned.add("soncap-procurement-aware");
  if (moduleCompleted(snap, "lesson-6-")) earned.add("dares-funding-scout");
  if (Object.keys(snap.capstone).length === 22 && Object.values(snap.capstone).every((s) => s.status === "complete")) {
    earned.add("capstone-defender");
  }
  return [...earned];
}
