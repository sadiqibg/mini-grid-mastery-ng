"use client";

import { useState } from "react";
import type { FlashcardDeck } from "@/lib/content";
import { useStore } from "@/lib/store";

export default function DeckClient({ deck }: { deck: FlashcardDeck }) {
  const review = useStore((s) => s.reviewFlashcard);
  const dueIds = useStore((s) => s.dueCards(deck.cards.map((c) => c.id)));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const queue = dueIds.length > 0 ? deck.cards.filter((c) => dueIds.includes(c.id)) : deck.cards;
  const card = queue[idx];

  if (sessionDone || !card) {
    return (
      <div className="grid max-w-md gap-3">
        <h1 className="text-2xl font-semibold">{deck.title}</h1>
        <p className="text-ink-500">No cards due right now. 🎉 Come back tomorrow.</p>
      </div>
    );
  }

  const grade = async (g: 0 | 1 | 2 | 3) => {
    await review(card.id, g);
    setRevealed(false);
    if (idx + 1 >= queue.length) setSessionDone(true);
    else setIdx(idx + 1);
  };

  return (
    <div className="grid max-w-xl gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{deck.title}</h1>
        <span className="text-xs text-ink-500">Card {idx + 1} of {queue.length}</span>
      </div>

      <div
        className="card min-h-[200px] cursor-pointer"
        onClick={() => setRevealed((r) => !r)}
      >
        <p className="text-xs uppercase text-ink-500">{revealed ? "Answer" : "Question"}</p>
        <p className="mt-3 text-lg">{revealed ? card.a : card.q}</p>
        {!revealed && <p className="mt-4 text-xs text-ink-500">Click to reveal</p>}
      </div>

      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          <button className="btn-secondary" onClick={() => grade(0)}>Again</button>
          <button className="btn-secondary" onClick={() => grade(1)}>Hard</button>
          <button className="btn-primary" onClick={() => grade(2)}>Good</button>
          <button className="btn-primary" onClick={() => grade(3)}>Easy</button>
        </div>
      )}
    </div>
  );
}
