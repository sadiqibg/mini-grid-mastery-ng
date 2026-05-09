"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function LessonClient({ lessonId, hasQuiz }: { lessonId: string; hasQuiz: boolean }) {
  const startLesson = useStore((s) => s.startLesson);
  const completeLesson = useStore((s) => s.completeLesson);
  const progress = useStore((s) => s.progress[lessonId]);

  useEffect(() => { void startLesson(lessonId); }, [lessonId, startLesson]);

  // For lessons without a quiz, show a "Mark complete" button.
  if (hasQuiz) return null;
  const done = progress?.status === "completed" || progress?.status === "mastered";

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        className={done ? "btn-ghost cursor-default" : "btn-primary"}
        disabled={done}
        onClick={() => void completeLesson(lessonId)}
      >
        {done ? "✓ Lesson complete" : "Mark lesson complete"}
      </button>
      {done && <span className="text-xs text-ink-500">Progress saved.</span>}
    </div>
  );
}
