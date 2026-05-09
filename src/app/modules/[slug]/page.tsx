import { notFound } from "next/navigation";
import Link from "next/link";
import { getModuleMeta, listAllModules } from "@/lib/content";

export function generateStaticParams() {
  return listAllModules().map((m) => ({ slug: m.slug }));
}

export default function ModulePage({ params }: { params: { slug: string } }) {
  const mod = getModuleMeta(params.slug);
  if (!mod) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase text-ink-500">Module {mod.slug.split("-")[0]}</p>
        <h1 className="mt-1 text-3xl font-semibold">{mod.title}</h1>
        {mod.summary && <p className="mt-2 text-ink-500">{mod.summary}</p>}
      </div>

      {mod.lessons.length === 0 ? (
        <div className="card">
          <p className="text-ink-500">
            This module is scaffolded — lessons will be authored in subsequent sprints. Frontmatter
            and structure are ready to receive content.
          </p>
        </div>
      ) : (
        <ol className="grid gap-3">
          {mod.lessons.map((l, i) => (
            <li key={l.frontmatter.id}>
              <Link href={`/modules/${mod.slug}/${l.slug}`} className="block card hover:border-brand-500">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-ink-500">Lesson {i + 1} · {l.frontmatter.pacer_type}</p>
                    <p className="mt-1 font-semibold">{l.frontmatter.title}</p>
                    <p className="mt-1 text-sm text-ink-500">{l.frontmatter.learning_objective}</p>
                  </div>
                  <span className="text-xs text-ink-500">{l.frontmatter.estimated_minutes} min</span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
