"use client";

import { useStore } from "@/lib/store";

export default function EvidenceQuote({
  lessonId,
  source,
  children,
}: {
  lessonId: string;
  source: string;
  children: React.ReactNode;
}) {
  const progress = useStore((s) => s.progress[lessonId]);
  const markDone = useStore((s) => s.markPacerDone);
  const done = progress?.pacerActionDone ?? false;

  return (
    <figure className="my-6 rounded-lg border-l-4 border-brand-500 bg-brand-50/40 p-5">
      <p className="text-xs font-semibold uppercase text-brand-700">Evidence · Store this fact</p>
      <blockquote className="mt-2 text-sm text-ink-900">{children}</blockquote>
      <figcaption className="mt-2 text-xs text-ink-500">— {source}</figcaption>
      <button
        className={done ? "btn-ghost mt-3 cursor-default" : "btn-secondary mt-3"}
        disabled={done}
        onClick={() => void markDone(lessonId)}
      >
        {done ? "✓ Stored" : "I have stored this"}
      </button>
    </figure>
  );
}
