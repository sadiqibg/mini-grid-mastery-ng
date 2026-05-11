// Build-time content validator. Run with: npm run validate-content
import fs from "node:fs";
import path from "node:path";
import { listAllModules } from "../src/lib/content";

const ROOT = process.cwd();
const modules = listAllModules();
const allLessonIds = new Set<string>();
const errors: string[] = [];

function fileExists(p: string) { return fs.existsSync(path.join(ROOT, p)); }

// Pass 1: collect lesson ids and check for duplicates.
for (const m of modules) {
  for (const l of m.lessons) {
    if (allLessonIds.has(l.frontmatter.id)) {
      errors.push(`Duplicate lesson id: ${l.frontmatter.id}`);
    }
    allLessonIds.add(l.frontmatter.id);
  }
}

const conceptMapFiles = new Set(
  fs.existsSync(path.join(ROOT, "content/concept-maps"))
    ? fs.readdirSync(path.join(ROOT, "content/concept-maps")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
    : []
);
const flashcardDecks = new Set(
  fs.existsSync(path.join(ROOT, "content/flashcards"))
    ? fs.readdirSync(path.join(ROOT, "content/flashcards")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""))
    : []
);
// Labs that actually exist as routes.
const knownLabs = new Set(["load-survey", "pv-sizing", "regulatory-tree"]);

// Pass 2: validate per-lesson constraints.
for (const m of modules) {
  for (const l of m.lessons) {
    const fm = l.frontmatter;

    // Prerequisites must resolve to real lesson ids.
    for (const p of fm.prerequisites) {
      if (!allLessonIds.has(p)) {
        errors.push(`${fm.id}: prerequisite "${p}" not found`);
      }
    }

    // frontmatter.module must match the folder.
    if (fm.module !== m.slug) {
      errors.push(`${fm.id}: frontmatter.module="${fm.module}" but lives in folder "${m.slug}"`);
    }

    // Lesson id must follow lesson-N-NN where N matches the module's leading number.
    const idMatch = fm.id.match(/^lesson-(\d+)-(\d+)$/);
    if (!idMatch) {
      errors.push(`${fm.id}: id does not match /^lesson-\\d+-\\d+$/ — fix the convention`);
    } else {
      const moduleNum = Number(m.slug.split("-")[0]);
      const idNum = Number(idMatch[1]);
      if (idNum !== moduleNum) {
        errors.push(`${fm.id}: id prefix "lesson-${idNum}-" does not match module "${m.slug}" (expected lesson-${moduleNum}-XX)`);
      }
    }

    // Optional frontmatter pointers must resolve.
    if (fm.flashcard_deck && !flashcardDecks.has(fm.flashcard_deck)) {
      errors.push(`${fm.id}: flashcard_deck "${fm.flashcard_deck}" not found in /content/flashcards/`);
    }
    if (fm.concept_map && !conceptMapFiles.has(fm.concept_map)) {
      errors.push(`${fm.id}: concept_map "${fm.concept_map}" not found in /content/concept-maps/`);
    }
    if (fm.lab && !knownLabs.has(fm.lab)) {
      errors.push(`${fm.id}: lab "${fm.lab}" is not a known lab route (${[...knownLabs].join(", ")})`);
    }

    // Pass 3: scan MDX body for inline references to assets that must exist.
    const mapRefs = [...l.body.matchAll(/mapId="([^"]+)"/g)].map((m) => m[1]);
    for (const ref of mapRefs) {
      if (!conceptMapFiles.has(ref)) {
        errors.push(`${fm.id}: MDX references concept map "${ref}" which does not exist`);
      }
    }
    const deckRefs = [...l.body.matchAll(/deck="([^"]+)"/g)].map((m) => m[1]);
    for (const ref of deckRefs) {
      if (!flashcardDecks.has(ref)) {
        errors.push(`${fm.id}: MDX references flashcard deck "${ref}" which does not exist`);
      }
    }
    const labRefs = [...l.body.matchAll(/href="\/labs\/([^"]+)"/g)].map((m) => m[1]);
    for (const ref of labRefs) {
      if (!knownLabs.has(ref)) {
        errors.push(`${fm.id}: MDX references unknown lab "/labs/${ref}"`);
      }
    }

    // Quiz file must exist if assessment_type=quiz.
    if (fm.assessment_type === "quiz") {
      const quizPath = `content/modules/${m.slug}/${l.slug}.quiz.json`;
      if (!fileExists(quizPath)) {
        errors.push(`${fm.id}: assessment_type=quiz but ${quizPath} not found`);
      } else {
        try {
          const items = JSON.parse(fs.readFileSync(path.join(ROOT, quizPath), "utf-8"));
          if (!Array.isArray(items) || items.length === 0) {
            errors.push(`${fm.id}: quiz file is empty or not an array`);
          }
          for (const q of items) {
            if (typeof q.answerIndex !== "number" || q.answerIndex < 0 || q.answerIndex >= (q.options?.length ?? 0)) {
              errors.push(`${fm.id} quiz ${q.id}: answerIndex out of range`);
            }
            if (q.options && new Set(q.options).size !== q.options.length) {
              errors.push(`${fm.id} quiz ${q.id}: duplicate options`);
            }
          }
        } catch (e) {
          errors.push(`${fm.id}: quiz file is not valid JSON`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error("Content validation failed:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(`Content OK: ${modules.length} modules, ${allLessonIds.size} lessons, ${conceptMapFiles.size} concept maps, ${flashcardDecks.size} flashcard decks.`);
