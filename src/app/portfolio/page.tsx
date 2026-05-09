"use client";

import { useStore } from "@/lib/store";

export default function Portfolio() {
  const labArtifacts = useStore((s) => s.labArtifacts);
  const conceptMaps = useStore((s) => s.conceptMaps);
  const capstone = useStore((s) => s.capstone);
  const identity = useStore((s) => s.identity);

  const downloadJson = () => {
    const blob = new Blob(
      [JSON.stringify({ identity, labArtifacts, conceptMaps, capstone }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mini-grid-portfolio-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <button className="btn-secondary" onClick={downloadJson}>Export JSON</button>
      </div>

      <section>
        <h2 className="font-semibold">Lab artifacts</h2>
        {Object.values(labArtifacts).length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No lab artifacts yet. Complete a lab to add one.</p>
        ) : (
          <ul className="mt-2 grid gap-3">
            {Object.values(labArtifacts).map((a) => (
              <li key={a.id} className="card">
                <p className="font-semibold capitalize">{a.labId.replace("-", " ")}</p>
                <p className="text-xs text-ink-500">Updated {new Date(a.updatedAt).toLocaleString()}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-ink-900/5 p-3 text-xs">{JSON.stringify(a.payload, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Concept maps</h2>
        {Object.values(conceptMaps).length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No concept maps yet.</p>
        ) : (
          <ul className="mt-2 grid gap-2 text-sm">
            {Object.values(conceptMaps).map((c) => (
              <li key={c.mapId} className="card">
                <p className="font-semibold">{c.mapId}</p>
                <p className="text-xs text-ink-500">
                  {c.payload.nodes.length} nodes, {c.payload.edges.length} edges ·
                  {c.submittedAt ? " submitted" : " in progress"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
