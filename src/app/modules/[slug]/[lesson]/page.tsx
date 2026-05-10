import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { listAllModules, readLesson, readQuiz } from "@/lib/content";
import { mdxComponents } from "@/components/MdxComponents";
import LessonClient from "./LessonClient";
import Quiz from "@/components/Quiz";

export function generateStaticParams() {
  const out: { slug: string; lesson: string }[] = [];
  for (const m of listAllModules()) {
    for (const l of m.lessons) out.push({ slug: m.slug, lesson: l.slug });
  }
  return out;
}

export default function LessonPage({ params }: { params: { slug: string; lesson: string } }) {
  const lesson = readLesson(params.slug, params.lesson);
  if (!lesson) notFound();
  const fm = lesson.frontmatter;
  const quiz = lesson.hasQuiz ? readQuiz(params.slug, params.lesson) : null;

  return (
    <article className="grid max-w-3xl gap-6">
      <div>
        <Link href={`/modules/${params.slug}`} className="text-xs uppercase text-ink-500 hover:text-brand-700">
          ← Back to module
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{fm.title}</h1>
        <p className="mt-2 text-sm text-ink-500">
          <span className="rounded bg-brand-50 px-2 py-0.5 font-medium uppercase text-brand-700">{fm.pacer_type}</span>
          <span className="mx-2">·</span>
          {fm.estimated_minutes} min · {fm.xp} XP
        </p>
        <p className="mt-3 italic text-ink-700">{fm.learning_objective}</p>
      </div>

      <div className="prose prose-ink max-w-none">
        <MDXRemote
          source={lesson.body}
          components={mdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </div>

      {quiz && quiz.length > 0 && (
        <Quiz lessonId={fm.id} questions={quiz} masteryThreshold={fm.mastery_threshold} />
      )}

      <LessonClient lessonId={fm.id} hasQuiz={!!quiz && quiz.length > 0} />
    </article>
  );
}
