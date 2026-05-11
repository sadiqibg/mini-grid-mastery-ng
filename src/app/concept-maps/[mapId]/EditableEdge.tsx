"use client";

// Custom React Flow edge with an inline-editable label.
// Click the label, type the relationship in your own words, blur or Enter to save.

import { useEffect, useRef, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

export default function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(typeof label === "string" ? label : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    const ev = new CustomEvent("conceptmap:edgeLabel", { detail: { id, label: trimmed } });
    window.dispatchEvent(ev);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(typeof label === "string" ? label : "");
  };

  const displayed = typeof label === "string" && label ? label : "(click to label)";

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              placeholder="e.g. powers, regulates, depends on…"
              className="min-w-[160px] rounded border border-brand-500 bg-white px-2 py-0.5 text-xs shadow-sm focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className={`rounded px-2 py-0.5 text-xs shadow-sm ring-1 ${
                typeof label === "string" && label
                  ? "bg-white text-ink-700 ring-ink-300 hover:ring-brand-500"
                  : "bg-amber-50 text-amber-800 ring-amber-300 hover:ring-amber-500"
              }`}
            >
              {displayed}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
