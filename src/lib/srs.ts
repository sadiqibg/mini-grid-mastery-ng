// SM-2-lite spaced-repetition scheduler.
// Grades: 0=again, 1=hard, 2=good, 3=easy.

import type { FlashcardState } from "./storage";

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function reviewCard(state: FlashcardState | undefined, grade: 0 | 1 | 2 | 3, cardId: string): FlashcardState {
  const prev: FlashcardState = state ?? {
    cardId,
    ease: 2.5,
    intervalDays: 0,
    dueOn: todayIso(),
  };

  let { ease, intervalDays } = prev;
  if (grade === 0) {
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    if (intervalDays === 0) intervalDays = grade === 1 ? 1 : grade === 2 ? 2 : 4;
    else intervalDays = Math.round(intervalDays * (grade === 1 ? 1.2 : grade === 2 ? ease : ease * 1.3));
    // Cap at 10 years — anything longer means the card has effectively been retired,
    // and uncapped growth eventually overflows Date arithmetic in addDays().
    if (intervalDays > 3650) intervalDays = 3650;
    ease = Math.min(2.8, ease + (grade === 3 ? 0.15 : grade === 2 ? 0 : -0.05));
  }

  return {
    cardId,
    ease,
    intervalDays,
    dueOn: addDays(todayIso(), intervalDays),
    lastGrade: grade,
  };
}

export function isDue(state: FlashcardState | undefined): boolean {
  if (!state) return true;
  return state.dueOn <= todayIso();
}
