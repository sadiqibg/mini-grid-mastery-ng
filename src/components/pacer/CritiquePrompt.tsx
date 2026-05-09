"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

type Option = { label: string; tradeoff: string; betterFor?: string };

export default function CritiquePrompt({
  lessonId,
  question,
  options,
}: {
  lessonId: string;
  question: string;
  options: Option[];
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const markDone = useStore((s) => s.markPacerDone);
  const progress = useStore((s) => s.progress[lessonId]);
  const done = progress?.pacerActionDone ?? false;

  return (
    <div className="my-6 rounded-lg border border-ink-300/50 bg-white p-5">
      <p className="text-xs font-semibold uppercase text-brand-700">Analogous · Critique</p>
      <p className="mt-2 font-medium">{question}</p>
      <div className="mt-3 grid gap-2">
        {options.map((o, i) => (
          <button
            key={i}
            className={`text-left rounded-md border p-3 text-sm transition ${picked === i ? "border-brand-500 bg-brand-50" : "border-ink-300/50 hover:border-brand-500"}`}
            onClick={() => setPicked(i)}
          >
            <p className="font-medium">{o.label}</p>
            {picked === i && (
              <div className="mt-2 text-xs text-ink-700">
                <p><strong>Trade-off:</strong> {o.tradeoff}</p>
                {o.betterFor && <p className="mt-1"><strong>Better when:</strong> {o.betterFor}</p>}
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-500">
        There's no single right answer — pick whichever you'd defend, see the trade-off, then mark done.
      </p>
      <button
        className={done ? "btn-ghost mt-3 cursor-default" : "btn-secondary mt-3"}
        disabled={done || picked === null}
        onClick={() => void markDone(lessonId)}
      >
        {done ? "✓ Critique done" : "Mark critique done"}
      </button>
    </div>
  );
}
