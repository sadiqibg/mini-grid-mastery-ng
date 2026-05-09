// Server-only content loader. Reads MDX lessons + module metadata from /content.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_ROOT = path.join(process.cwd(), "content");

export type PacerType = "procedural" | "analogous" | "conceptual" | "evidence" | "reference";

export type LessonFrontmatter = {
  id: string;
  title: string;
  module: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  pacer_type: PacerType;
  nigerian_context: boolean;
  learning_objective: string;
  estimated_minutes: number;
  xp: number;
  prerequisites: string[];
  assessment_type: "quiz" | "practice" | "reading";
  mastery_threshold: number;
  flashcard_deck?: string;
  concept_map?: string;
  lab?: string;
};

export type Lesson = {
  frontmatter: LessonFrontmatter;
  body: string;
  slug: string;     // file slug, e.g. "01-nesi-overview"
  moduleSlug: string;
  hasQuiz: boolean;
};

export type ModuleMeta = {
  slug: string;
  title: string;
  order: number;
  summary?: string;
  lessons: Lesson[];
};

const REQUIRED_FIELDS: (keyof LessonFrontmatter)[] = [
  "id", "title", "module", "difficulty", "pacer_type", "nigerian_context",
  "learning_objective", "estimated_minutes", "xp", "prerequisites",
  "assessment_type", "mastery_threshold",
];

function validateFrontmatter(fm: any, file: string): LessonFrontmatter {
  for (const f of REQUIRED_FIELDS) {
    if (fm[f] === undefined) throw new Error(`[content] ${file}: missing frontmatter field "${f}"`);
  }
  return fm as LessonFrontmatter;
}

export function getModuleMeta(moduleSlug: string): ModuleMeta | null {
  const dir = path.join(CONTENT_ROOT, "modules", moduleSlug);
  if (!fs.existsSync(dir)) return null;
  const metaPath = path.join(dir, "_meta.json");
  let meta: { title: string; order: number; summary?: string };
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } else {
    meta = { title: moduleSlug, order: 999 };
  }
  const lessons = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((f) => readLesson(moduleSlug, f.replace(/\.mdx$/, "")))
    .filter((l): l is Lesson => l !== null);
  return { slug: moduleSlug, title: meta.title, order: meta.order, summary: meta.summary, lessons };
}

export function readLesson(moduleSlug: string, lessonSlug: string): Lesson | null {
  const file = path.join(CONTENT_ROOT, "modules", moduleSlug, `${lessonSlug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  const fm = validateFrontmatter(data, `${moduleSlug}/${lessonSlug}.mdx`);
  const quizPath = path.join(CONTENT_ROOT, "modules", moduleSlug, `${lessonSlug}.quiz.json`);
  return {
    frontmatter: fm,
    body: content,
    slug: lessonSlug,
    moduleSlug,
    hasQuiz: fs.existsSync(quizPath),
  };
}

export function readQuiz(moduleSlug: string, lessonSlug: string): QuizQuestion[] | null {
  const file = path.join(CONTENT_ROOT, "modules", moduleSlug, `${lessonSlug}.quiz.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as QuizQuestion[];
}

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};

export function listAllModules(): ModuleMeta[] {
  const dir = path.join(CONTENT_ROOT, "modules");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((d) => fs.statSync(path.join(dir, d)).isDirectory())
    .map((slug) => getModuleMeta(slug))
    .filter((m): m is ModuleMeta => m !== null)
    .sort((a, b) => a.order - b.order);
}

export type Flashcard = { id: string; q: string; a: string };
export type FlashcardDeck = { id: string; title: string; cards: Flashcard[] };

export function readDeck(deckId: string): FlashcardDeck | null {
  const file = path.join(CONTENT_ROOT, "flashcards", `${deckId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as FlashcardDeck;
}

export type ConceptMapAuthoring = {
  id: string;
  title: string;
  prompt: string;
  concept_pool: { id: string; label: string }[];
  relatedness_hints?: [string, string, string][];
  allow_custom_nodes: boolean;
  min_nodes_to_submit: number;
  min_edges_to_submit: number;
};

export function readConceptMap(mapId: string): ConceptMapAuthoring | null {
  const file = path.join(CONTENT_ROOT, "concept-maps", `${mapId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ConceptMapAuthoring;
}
