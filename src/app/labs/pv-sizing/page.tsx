"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { computePvSizing, PSH_PRESETS, type PvSizingInputs, type SystemVoltage } from "@/lib/labs/pv-sizing";

const DEFAULTS: PvSizingInputs = {
  dailyDemandWh: 50000,
  psh: 5.2,
  derating: 0.75,
  moduleW: 540,
  systemVoltage: 48,
  autonomyDays: 1.5,
  batteryChemistry: "lfp",
  inverterMaxInputV: 500,
  voc: 49.5,
  vocColdMultiplier: 1.18,
};

export default function PvSizingLab() {
  const save = useStore((s) => s.saveLabArtifact);
  const existing = useStore((s) => s.getLatestLabArtifact("pv-sizing"));
  const loadSurvey = useStore((s) => s.getLatestLabArtifact("load-survey"));

  const [inputs, setInputs] = useState<PvSizingInputs>(() => {
    const prior = existing?.payload?.inputs as PvSizingInputs | undefined;
    if (prior) return prior;
    const daily = (loadSurvey?.payload as any)?.computed?.dailyWh as number | undefined;
    return { ...DEFAULTS, dailyDemandWh: daily ?? DEFAULTS.dailyDemandWh };
  });

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(existing?.updatedAt ?? null);

  const result = useMemo(() => computePvSizing(inputs), [inputs]);

  const set = <K extends keyof PvSizingInputs>(k: K, v: PvSizingInputs[K]) =>
    setInputs((s) => ({ ...s, [k]: v }));

  const pullFromLoadSurvey = () => {
    const daily = (loadSurvey?.payload as any)?.computed?.dailyWh as number | undefined;
    if (daily) set("dailyDemandWh", Math.round(daily));
  };

  const onSave = async () => {
    setSaving(true);
    const artifact = await save("pv-sizing", { inputs, result });
    setSavedAt(artifact.updatedAt);
    setSaving(false);
  };

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">PV Sizing Lab</h1>
        <p className="mt-1 text-sm text-ink-500">First-pass standalone sizing. Cross-check with a hybrid simulation before procurement.</p>
      </header>

      {!loadSurvey && (
        <div className="card border-amber-300 bg-amber-50/40 text-sm text-amber-900">
          Tip: save a <Link className="underline" href="/labs/load-survey">Load Survey</Link> first and this lab will prefill the daily demand.
        </div>
      )}
      {loadSurvey && (
        <div className="card border-brand-500/30 bg-brand-50/30 text-sm">
          Load Survey artifact available — <button className="font-medium text-brand-700 underline" onClick={pullFromLoadSurvey}>pull daily demand</button>.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Daily demand (Wh)">
          <NumInput value={inputs.dailyDemandWh} onChange={(v) => set("dailyDemandWh", v)} step={100} />
        </Field>
        <Field label="PSH (peak sun hours)">
          <div className="flex gap-2">
            <NumInput value={inputs.psh} onChange={(v) => set("psh", v)} step={0.1} />
            <select className="rounded border border-ink-300 p-1 text-xs" value={inputs.psh} onChange={(e) => set("psh", parseFloat(e.target.value))}>
              {PSH_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Derating (0–1)">
          <NumInput value={inputs.derating} onChange={(v) => set("derating", v)} step={0.01} min={0} max={1} />
        </Field>
        <Field label="Module rating (Wp)">
          <NumInput value={inputs.moduleW} onChange={(v) => set("moduleW", v)} step={10} />
        </Field>
        <Field label="System bus voltage (V)">
          <select className="rounded border border-ink-300 p-1 text-sm" value={inputs.systemVoltage} onChange={(e) => set("systemVoltage", Number(e.target.value) as SystemVoltage)}>
            {[12, 24, 48, 96, 240, 400].map((v) => <option key={v} value={v}>{v} V</option>)}
          </select>
        </Field>
        <Field label="Autonomy (days)">
          <NumInput value={inputs.autonomyDays} onChange={(v) => set("autonomyDays", v)} step={0.5} min={0} />
        </Field>
        <Field label="Battery chemistry">
          <select className="rounded border border-ink-300 p-1 text-sm" value={inputs.batteryChemistry} onChange={(e) => set("batteryChemistry", e.target.value as "lead-acid" | "lfp")}>
            <option value="lfp">LFP (Li-ion, DoD 0.80)</option>
            <option value="lead-acid">Lead-acid (DoD 0.50)</option>
          </select>
        </Field>
        <Field label="Module Voc (V)">
          <NumInput value={inputs.voc} onChange={(v) => set("voc", v)} step={0.1} />
        </Field>
        <Field label="Cold-Voc multiplier">
          <NumInput value={inputs.vocColdMultiplier} onChange={(v) => set("vocColdMultiplier", v)} step={0.01} min={1} max={1.3} />
        </Field>
        <Field label="Controller max input (V)">
          <NumInput value={inputs.inverterMaxInputV} onChange={(v) => set("inverterMaxInputV", v)} step={10} />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Array (Wp computed)" value={`${(result.arrayWp / 1000).toFixed(1)} kWp`} />
        <Metric label="Module count" value={`${result.moduleCount} × ${inputs.moduleW} W`} sub={`${(result.arrayActualWp / 1000).toFixed(1)} kWp installed`} />
        <Metric label="Battery (nameplate)" value={`${(result.batteryNameplateWh / 1000).toFixed(1)} kWh`} sub={`${Math.round(result.batteryNameplateAh)} Ah at ${inputs.systemVoltage} V`} />
      </section>

      <section className="card">
        <h2 className="font-semibold">String design</h2>
        <ul className="mt-2 grid gap-1 text-sm">
          <li>Modules per string: <strong>{result.modulesPerString}</strong></li>
          <li>Strings in parallel: <strong>{result.totalStrings}</strong></li>
          <li>String Voc (cold morning): <strong>{Math.round(result.stringVocCold)} V</strong> vs controller max {inputs.inverterMaxInputV} V</li>
        </ul>
      </section>

      {result.notes.length > 0 && (
        <section className="text-xs text-ink-500">
          {result.notes.map((n, i) => <p key={i}>• {n}</p>)}
        </section>
      )}

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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs uppercase text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

function NumInput({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      className="w-full rounded border border-ink-300 p-1 text-sm"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}
