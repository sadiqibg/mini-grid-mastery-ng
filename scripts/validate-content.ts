// Build-time content validator. Run with: npm run validate-content
import { listAllModules } from "../src/lib/content";

const modules = listAllModules();
const allLessonIds = new Set<string>();
const errors: string[] = [];

for (const m of modules) {
  for (const l of m.lessons) {
    if (allLessonIds.has(l.frontmatter.id)) {
      errors.push(`Duplicate lesson id: ${l.frontmatter.id}`);
    }
    allLessonIds.add(l.frontmatter.id);
  }
}

for (const m of modules) {
  for (const l of m.lessons) {
    for (const p of l.frontmatter.prerequisites) {
      if (!allLessonIds.has(p)) {
        errors.push(`${l.frontmatter.id}: prerequisite "${p}" not found`);
      }
    }
    if (l.frontmatter.module !== m.slug) {
      errors.push(`${l.frontmatter.id}: frontmatter.module="${l.frontmatter.module}" but lives in folder "${m.slug}"`);
    }
  }
}

if (errors.length) {
  console.error("Content validation failed:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(`Content OK: ${modules.length} modules, ${allLessonIds.size} lessons.`);
