"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function PracticeTask({
  lessonId,
  labHref,
  children,
}: {
  lessonId: string;
  labHref?: string;
  children: React.ReactNode;
}) {
  const progress = useStore((s) => s.progress[lessonId]);
  const markDone = useStore((s) => s.markPacerDone);
  const done = progress?.pacerActionDone ?? false;

  return (
    <div className="my-6 rounded-lg border border-ink-300/50 bg-white p-5">
      <p className="text-xs font-semibold uppercase text-brand-700">Procedural · Practice task</p>
      <div className="prose prose-sm mt-2 max-w-none">{children}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {labHref && (
          <Link href={labHref} className="btn-primary">Open the lab</Link>
        )}
        <button
          className={done ? "btn-ghost cursor-default" : "btn-secondary"}
          disabled={done}
          onClick={() => void markDone(lessonId)}
        >
          {done ? "✓ Marked done" : "Mark practice done"}
        </button>
      </div>
    </div>
  );
}
