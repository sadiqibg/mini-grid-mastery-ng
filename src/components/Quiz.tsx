"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/content";
import { useStore } from "@/lib/store";

export default function Quiz({
  lessonId,
  questions,
  masteryThreshold,
}: {
  lessonId: string;
  questions: QuizQuestion[];
  masteryThreshold: number;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const recordQuiz = useStore((s) => s.recordQuiz);
  const progress = useStore((s) => s.progress[lessonId]);

  const score = submitted
    ? Math.round((questions.filter((q) => answers[q.id] === q.answerIndex).length / questions.length) * 100)
    : 0;

  return (
    <section className="mt-8 rounded-lg border border-ink-300/50 bg-white p-5">
      <h3 className="text-lg font-semibold">Mini-quiz</h3>
      <p className="text-xs text-ink-500">Pass at {masteryThreshold}% to mark this lesson complete.</p>
      <ol className="mt-4 grid gap-5">
        {questions.map((q, i) => (
          <li key={q.id}>
            <p className="font-medium">{i + 1}. {q.prompt}</p>
            <div className="mt-2 grid gap-1.5">
              {q.options.map((opt, idx) => {
                const picked = answers[q.id] === idx;
                const correct = submitted && idx === q.answerIndex;
                const wrong = submitted && picked && idx !== q.answerIndex;
                return (
                  <label
                    key={idx}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition ${
                      correct ? "border-brand-500 bg-brand-50"
                      : wrong ? "border-red-400 bg-red-50"
                      : picked ? "border-brand-500"
                      : "border-ink-300/50 hover:border-brand-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      className="mt-1"
                      disabled={submitted}
                      checked={picked}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="mt-2 text-xs text-ink-500">↳ {q.explanation}</p>
            )}
          </li>
        ))}
      </ol>

      {!submitted ? (
        <button
          className="btn-primary mt-5"
          disabled={Object.keys(answers).length !== questions.length}
          onClick={async () => {
            setSubmitted(true);
            const correct = questions.filter((q) => answers[q.id] === q.answerIndex).length;
            const score = Math.round((correct / questions.length) * 100);
            await recordQuiz(lessonId, score, masteryThreshold);
          }}
        >
          Submit answers
        </button>
      ) : (
        <div className="mt-5 grid gap-3">
          <p className={`font-semibold ${score >= masteryThreshold ? "text-brand-700" : "text-amber-700"}`}>
            You scored {score}%. {score >= masteryThreshold ? "Lesson complete." : `Need ${masteryThreshold}% to pass — try again.`}
          </p>
          {score < masteryThreshold && (
            <button className="btn-secondary w-fit" onClick={() => { setSubmitted(false); setAnswers({}); }}>
              Try again
            </button>
          )}
          {progress?.quizBestScore !== undefined && (
            <p className="text-xs text-ink-500">Best score so far: {progress.quizBestScore}%</p>
          )}
        </div>
      )}
    </section>
  );
}
