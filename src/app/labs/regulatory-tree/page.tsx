"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { derivePathway, type RegAnswers } from "@/lib/labs/regulatory-tree";

export default function RegulatoryTreeLab() {
  const save = useStore((s) => s.saveLabArtifact);
  const existing = useStore((s) => s.getLatestLabArtifact("regulatory-tree"));
  const [answers, setAnswers] = useState<RegAnswers>(() => (existing?.payload?.answers as RegAnswers) ?? {});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(existing?.updatedAt ?? null);

  const result = useMemo(() => derivePathway(answers), [answers]);

  const set = <K extends keyof RegAnswers>(k: K, v: RegAnswers[K]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    const artifact = await save("regulatory-tree", { answers, result });
    setSavedAt(artifact.updatedAt);
    setSaving(false);
  };

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Regulatory Decision Tree</h1>
        <p className="mt-1 text-sm text-ink-500">2026 NERC Mini-Grid Regulations. Answers below derive your pathway and required compliance steps.</p>
      </header>

      <section className="grid gap-5">
        <Choice
          label="Is the project isolated or interconnected?"
          value={answers.interconnect}
          options={[
            { value: "isolated", label: "Isolated" },
            { value: "interconnected", label: "Interconnected with a DisCo feeder" },
          ]}
          onChange={(v) => set("interconnect", v as RegAnswers["interconnect"])}
        />
        <NumberQ
          label="Planned installed capacity (kW)"
          value={answers.capacity}
          onChange={(v) => set("capacity", v)}
        />
        <Choice
          label="Is the state operating its own SERC?"
          value={answers["state-serc"]}
          options={[
            { value: "yes", label: "Yes — operational SERC" },
            { value: "no", label: "No / unsure" },
          ]}
          onChange={(v) => set("state-serc", v as RegAnswers["state-serc"])}
        />
        <Choice
          label="Land + community access documented?"
          value={answers.land}
          options={[
            { value: "yes", label: "Yes — written agreement and access rights" },
            { value: "no", label: "No / informal" },
          ]}
          onChange={(v) => set("land", v as RegAnswers["land"])}
        />
        <Choice
          label="Major regulated components imported?"
          value={answers.imports}
          options={[
            { value: "yes", label: "Yes — imported modules / batteries / inverters" },
            { value: "no", label: "No — fully local procurement" },
          ]}
          onChange={(v) => set("imports", v as RegAnswers["imports"])}
        />
      </section>

      {!result && (
        <div className="card text-sm text-ink-500">Answer the first three questions to see the pathway.</div>
      )}

      {result && (
        <>
          <section className="card border-brand-500/40 bg-brand-50/30">
            <p className="text-xs uppercase text-brand-700">Derived pathway</p>
            <p className="mt-1 text-lg font-semibold">{result.summary}</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Row label="Primary regulator" value={result.regulator} />
            <Row label="Pathway" value={result.pathway} />
            <Row label="Tripartite Agreement" value={result.tripartiteRequired ? "Required" : "Not required"} />
            <Row label="DisCo response clock" value={result.discoClockDays ? `${result.discoClockDays} business days (silence = no objection)` : "—"} />
            <Row label="NEMSA inspection" value="Required before energisation" />
            <Row label="Import conformity" value={result.importConformity} />
            <Row label="COREN-signed design" value={result.corenRequired ? "Required" : "Below threshold"} />
            <Row label="Community documentation" value="Host Community Agreement on file" />
          </section>

          <section className="card">
            <h2 className="font-semibold">Documents required regardless of pathway</h2>
            <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm">
              {result.documentsAlways.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </section>

          {result.warnings.length > 0 && (
            <section className="card border-amber-300 bg-amber-50/40">
              <h2 className="font-semibold text-amber-900">Warnings</h2>
              <ul className="mt-2 grid gap-1 text-sm text-amber-900">
                {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save artifact"}</button>
            {savedAt && <span className="text-xs text-ink-500">Saved at {new Date(savedAt).toLocaleString()}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-300 bg-white hover:border-brand-500"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NumberQ({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        type="number"
        min={1}
        step={1}
        value={value ?? ""}
        className="w-40 rounded border border-ink-300 p-1.5 text-sm"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex items-start justify-between gap-3">
      <p className="text-xs uppercase text-ink-500">{label}</p>
      <p className="text-right text-sm font-medium">{value}</p>
    </div>
  );
}
