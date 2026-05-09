"use client";

import Link from "next/link";

export default function ConceptMapPrompt({ mapId, lessonId }: { mapId: string; lessonId?: string }) {
  return (
    <div className="my-6 rounded-lg border border-ink-300/50 bg-white p-5">
      <p className="text-xs font-semibold uppercase text-brand-700">Conceptual · Build your own map</p>
      <p className="mt-2 text-sm text-ink-700">
        Drag concepts onto the canvas, draw your own connections, and label them however you'd
        defend them. There is no single correct map — the point is that you build *your* model.
      </p>
      <Link href={`/concept-maps/${mapId}${lessonId ? `?from=${lessonId}` : ""}`} className="btn-primary mt-3">
        Open the map
      </Link>
    </div>
  );
}
