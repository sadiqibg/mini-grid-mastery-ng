export const XP_VALUES = {
  lessonComplete: 20,
  pacerDone: 10,
  labArtifact: 40,
  quizPass: 50,
  quizImprove: 25,
  conceptMap: 60,
  capstoneMilestone: 150,
  flashcardSession: 5,
} as const;

export type XpSource = keyof typeof XP_VALUES;

// Module unlock list — must match content/modules folder slugs.
export const MODULES_IN_ORDER = [
  "00-onboarding",
  "01-nigeria-electricity",
  "02-load-and-solar",
  "03-pv-components",
  "04-hybrid-topologies",
  "05-sizing-boq-protection",
  "06-regulation-finance",
  "07-site-selection",
  "08-simulation",
  "09-capstone",
] as const;

export type ModuleSlug = typeof MODULES_IN_ORDER[number];

export type Rank = { id: string; label: string; unlocksAfter: string };

// Course Doc §7 ranks. Each rank is unlocked when all prior modules are completed.
export const RANKS: Rank[] = [
  { id: "grid-novice", label: "Grid Novice", unlocksAfter: "00-onboarding" },
  { id: "energy-scout", label: "Energy Scout", unlocksAfter: "01-nigeria-electricity" },
  { id: "load-detective", label: "Load Detective", unlocksAfter: "02-load-and-solar" },
  { id: "pv-builder", label: "PV Builder", unlocksAfter: "03-pv-components" },
  { id: "hybrid-designer", label: "Hybrid Designer", unlocksAfter: "04-hybrid-topologies" },
  { id: "systems-optimiser", label: "Systems Optimiser", unlocksAfter: "05-sizing-boq-protection" },
  { id: "regulation-navigator", label: "Regulation Navigator", unlocksAfter: "06-regulation-finance" },
  { id: "project-developer", label: "Project Developer", unlocksAfter: "07-site-selection" },
  { id: "simulation-analyst", label: "Simulation Analyst", unlocksAfter: "08-simulation" },
  { id: "mini-grid-expert", label: "Mini-Grid Expert", unlocksAfter: "09-capstone" },
];

export function rankFor(completedModules: Set<string>): Rank {
  let current: Rank = RANKS[0];
  for (const r of RANKS) {
    if (completedModules.has(r.unlocksAfter)) current = r;
  }
  return current;
}
