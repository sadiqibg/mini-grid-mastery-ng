"use client";

import Link from "next/link";

export default function FlashcardPrompt({ deck, lessonId }: { deck: string; lessonId?: string }) {
  return (
    <div className="my-6 rounded-lg border border-ink-300/50 bg-white p-5">
      <p className="text-xs font-semibold uppercase text-brand-700">Reference · Flashcards</p>
      <p className="mt-2 text-sm text-ink-700">
        Lock in the key terms with spaced repetition.
      </p>
      <Link href={`/flashcards/${deck}${lessonId ? `?from=${lessonId}` : ""}`} className="btn-primary mt-3">
        Open deck
      </Link>
    </div>
  );
}
