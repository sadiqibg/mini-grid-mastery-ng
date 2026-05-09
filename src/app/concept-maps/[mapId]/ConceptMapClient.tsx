"use client";

// MVP scaffold: a minimal placeholder for the React Flow editor.
// The full open-ended map builder lands in sprint 4. For now, this page lets
// learners read the prompt, see the concept pool + hints, and submit a stub
// payload so XP / progress tracking still works end-to-end.

import { useState } from "react";
import type { ConceptMapAuthoring } from "@/lib/content";
import { useStore } from "@/lib/store";

export default function ConceptMapClient({ map }: { map: ConceptMapAuthoring }) {
  const save = useStore((s) => s.saveConceptMap);
  const attempt = useStore((s) => s.conceptMaps[map.id]);
  const [showHints, setShowHints] = useState(false);
  const submitted = !!attempt?.submittedAt;

  const submit = async () => {
    // Placeholder payload — real editor lands in sprint 4.
    const nodes = map.concept_pool.slice(0, map.min_nodes_to_submit).map((c, i) => ({
      id: c.id, label: c.label, x: 80 + i * 160, y: 120,
    }));
    const edges = (map.relatedness_hints ?? []).slice(0, map.min_edges_to_submit).map((h) => ({
      from: h[0], to: h[1], label: "(your label here)",
    }));
    await save(map.id, { nodes, edges }, true);
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{map.title}</h1>
        <p className="mt-2 text-ink-700">{map.prompt}</p>
      </div>

      <div className="card border-amber-300 bg-amber-50/40">
        <p className="text-sm text-amber-900">
          <strong>Builder coming in sprint 4.</strong> The full React Flow editor (drag concepts onto a
          canvas, draw edges, type your own relationship labels, add custom nodes) is the next milestone.
          For now, you can review the concept pool, peek at the relatedness hints, and submit a placeholder
          attempt to keep your progress moving.
        </p>
      </div>

      <section>
        <h2 className="font-semibold">Concept pool</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {map.concept_pool.map((c) => (
            <li key={c.id} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">{c.label}</li>
          ))}
        </ul>
        {map.allow_custom_nodes && (
          <p className="mt-2 text-xs text-ink-500">You'll be able to add your own concepts in the editor.</p>
        )}
      </section>

      {map.relatedness_hints && (
        <section>
          <button className="btn-ghost" onClick={() => setShowHints((v) => !v)}>
            {showHints ? "Hide" : "Show"} relatedness hints
          </button>
          {showHints && (
            <ul className="mt-2 grid gap-1 text-sm text-ink-700">
              {map.relatedness_hints.map((h, i) => (
                <li key={i}>
                  <strong>{h[0]} ↔ {h[1]}</strong> — {h[2]}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-500">
            Hints suggest pairs worth thinking about. They never tell you <em>how</em> the concepts relate —
            that's yours to decide.
          </p>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          className={submitted ? "btn-ghost cursor-default" : "btn-primary"}
          disabled={submitted}
          onClick={submit}
        >
          {submitted ? "✓ Submitted (placeholder)" : "Submit placeholder attempt"}
        </button>
        {submitted && (
          <span className="text-xs text-ink-500">XP awarded. Revisit once the editor ships to refine your map.</span>
        )}
      </div>
    </div>
  );
}
