"use client";

// Open-ended concept map editor — no scoring.
// The pedagogical point is the *learner's* mental model. We provide a concept pool,
// optional relatedness hints, and the ability to add custom nodes and write your own
// relationship labels. We never compare against an "answer key".

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "@/lib/store";
import type { ConceptMapAuthoring } from "@/lib/content";
import EditableEdge from "./EditableEdge";

const edgeTypes = { editable: EditableEdge };

type FlowNode = Node<{ label: string; custom?: boolean }>;
type FlowEdge = Edge<{ label: string }>;

function makeInitialLayout(map: ConceptMapAuthoring, restored?: { nodes: any[]; edges: any[] }): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (restored?.nodes?.length) {
    return {
      nodes: restored.nodes.map((n: any) => ({
        id: n.id,
        type: "default",
        position: { x: n.x ?? 80, y: n.y ?? 80 },
        data: { label: n.label, custom: n.custom },
      })),
      edges: (restored.edges ?? []).map((e: any) => ({
        id: `e-${e.from}-${e.to}-${uuidv4().slice(0, 6)}`,
        source: e.from,
        target: e.to,
        type: "editable",
        label: e.label || "",
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    };
  }
  return { nodes: [], edges: [] };
}

export default function ConceptMapClient({ map }: { map: ConceptMapAuthoring }) {
  return (
    <ReactFlowProvider>
      <Editor map={map} />
    </ReactFlowProvider>
  );
}

function Editor({ map }: { map: ConceptMapAuthoring }) {
  const save = useStore((s) => s.saveConceptMap);
  const attempt = useStore((s) => s.conceptMaps[map.id]);
  const [{ nodes, edges }, setGraph] = useState(() => makeInitialLayout(map, attempt?.payload as any));
  const [showHints, setShowHints] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return; // skip empty-canvas auto-save
    const t = setTimeout(() => { void save(map.id, serialize(nodes, edges), false); }, 2000);
    return () => clearTimeout(t);
  }, [nodes, edges, save, map.id]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setGraph((g) => ({ ...g, nodes: applyNodeChanges(changes, g.nodes) as FlowNode[] })),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setGraph((g) => ({ ...g, edges: applyEdgeChanges(changes, g.edges) as FlowEdge[] })),
    []
  );

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    setGraph((g) => ({
      ...g,
      edges: addEdge(
        { ...conn, type: "editable", label: "", markerEnd: { type: MarkerType.ArrowClosed } } as Edge,
        g.edges
      ) as FlowEdge[],
    }));
  }, []);

  // EditableEdge dispatches a CustomEvent when a label is saved. Keep edge state in sync.
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, label } = (e as CustomEvent<{ id: string; label: string }>).detail;
      setGraph((g) => ({
        ...g,
        edges: g.edges.map((edge) => (edge.id === id ? { ...edge, label } : edge)),
      }));
    };
    window.addEventListener("conceptmap:edgeLabel", handler);
    return () => window.removeEventListener("conceptmap:edgeLabel", handler);
  }, []);

  const placedIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const available = map.concept_pool.filter((c) => !placedIds.has(c.id));

  const placeConcept = (c: { id: string; label: string }) => {
    setGraph((g) => ({
      ...g,
      nodes: [
        ...g.nodes,
        {
          id: c.id,
          type: "default",
          position: { x: 120 + Math.random() * 200, y: 120 + Math.random() * 300 },
          data: { label: c.label },
        },
      ],
    }));
  };

  const addCustom = () => {
    const label = customLabel.trim();
    if (!label) return;
    setGraph((g) => ({
      ...g,
      nodes: [
        ...g.nodes,
        {
          id: `custom-${uuidv4().slice(0, 6)}`,
          type: "default",
          position: { x: 200 + Math.random() * 200, y: 80 + Math.random() * 300 },
          data: { label, custom: true },
          style: { background: "#fff7ed", border: "1px solid #f59e0b" },
        },
      ],
    }));
    setCustomLabel("");
  };

  const meetsMin = nodes.length >= map.min_nodes_to_submit && edges.length >= map.min_edges_to_submit;
  const submitted = !!attempt?.submittedAt;

  const submit = async () => {
    setBusy(true);
    await save(map.id, serialize(nodes, edges), true);
    setBusy(false);
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{map.title}</h1>
        <p className="mt-2 text-ink-700">{map.prompt}</p>
        <p className="mt-2 text-xs text-ink-500">
          Click a concept to add it. Drag from one node's edge to another to create a connection — you'll name the relationship in your own words. No scoring; this is your map.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="h-[560px] rounded-lg border border-ink-300/50 bg-white">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>

        <aside className="grid content-start gap-3">
          <div className="card">
            <h3 className="text-sm font-semibold">Concept pool</h3>
            <p className="mt-1 text-xs text-ink-500">Click to drop onto the canvas.</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {available.length === 0 && <li className="text-xs text-ink-500">All placed.</li>}
              {available.map((c) => (
                <li key={c.id}>
                  <button className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100" onClick={() => placeConcept(c)}>
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {map.allow_custom_nodes && (
            <div className="card">
              <h3 className="text-sm font-semibold">Add your own</h3>
              <p className="mt-1 text-xs text-ink-500">For concepts not in the pool that you think belong.</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  placeholder="e.g. Harmattan dust"
                  className="w-full rounded border border-ink-300 p-1.5 text-xs"
                />
                <button className="btn-secondary text-xs" onClick={addCustom}>Add</button>
              </div>
            </div>
          )}

          {map.relatedness_hints && map.relatedness_hints.length > 0 && (
            <div className="card">
              <button className="text-sm font-semibold underline-offset-2 hover:underline" onClick={() => setShowHints((v) => !v)}>
                {showHints ? "Hide" : "Show"} relatedness hints
              </button>
              <p className="mt-1 text-xs text-ink-500">Hints flag pairs worth thinking about. They never say <em>how</em> the concepts relate.</p>
              {showHints && (
                <ul className="mt-2 grid gap-1 text-xs text-ink-700">
                  {map.relatedness_hints.map((h, i) => (
                    <li key={i}><strong>{h[0]} ↔ {h[1]}</strong> — <span className="text-ink-500">{h[2]}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="text-sm font-semibold">Progress</h3>
            <p className="mt-1 text-xs text-ink-500">Minimum to submit: {map.min_nodes_to_submit} nodes, {map.min_edges_to_submit} edges.</p>
            <p className="mt-1 text-xs">Now: <strong>{nodes.length}</strong> nodes · <strong>{edges.length}</strong> edges</p>
            <button
              className={submitted ? "btn-ghost mt-3 w-full cursor-default" : "btn-primary mt-3 w-full"}
              onClick={submit}
              disabled={busy || submitted || !meetsMin}
            >
              {submitted ? "✓ Submitted (revise any time)" : busy ? "Saving…" : meetsMin ? "Submit map" : `Need ${Math.max(0, map.min_nodes_to_submit - nodes.length)} more nodes / ${Math.max(0, map.min_edges_to_submit - edges.length)} more edges`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function serialize(nodes: FlowNode[], edges: FlowEdge[]) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: (n.data as any)?.label ?? n.id,
      x: n.position.x,
      y: n.position.y,
      custom: (n.data as any)?.custom ?? false,
    })),
    edges: edges.map((e) => ({
      from: e.source,
      to: e.target,
      label: (e.label as string) ?? "",
    })),
  };
}
