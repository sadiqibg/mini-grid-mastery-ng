"use client";

import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useStore } from "@/lib/store";
import {
  APPLIANCE_PRESETS,
  computeLoadSurvey,
  type LoadRow,
  type ApplianceClass,
  type CustomerClass,
} from "@/lib/labs/load-survey";

const CUSTOMER_CLASSES: CustomerClass[] = ["domestic", "shop", "productive", "public", "religious"];

function newRow(partial?: Partial<LoadRow>): LoadRow {
  return {
    id: uuidv4(),
    customerClass: "domestic",
    applianceClass: "lighting",
    appliance: "LED bulbs (per household)",
    quantity: 1,
    powerW: 30,
    hoursPerDay: 5,
    coincidenceFactor: 0.6,
    seasonalFactor: 1.0,
    ...partial,
  };
}

export default function LoadSurveyLab() {
  const save = useStore((s) => s.saveLabArtifact);
  const existing = useStore((s) => s.getLatestLabArtifact("load-survey"));
  const [rows, setRows] = useState<LoadRow[]>(() => {
    const fromArtifact = existing?.payload?.rows as LoadRow[] | undefined;
    return fromArtifact && fromArtifact.length ? fromArtifact : [newRow()];
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(existing?.updatedAt ?? null);

  const result = useMemo(() => computeLoadSurvey(rows), [rows]);

  const updateRow = (id: string, patch: Partial<LoadRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = () => setRows((rs) => [...rs, newRow({ customerClass: rs[rs.length - 1]?.customerClass ?? "domestic" })]);

  const onApplianceChange = (id: string, applianceClass: ApplianceClass) => {
    const preset = APPLIANCE_PRESETS.find((p) => p.class === applianceClass);
    if (!preset) return updateRow(id, { applianceClass });
    updateRow(id, {
      applianceClass,
      appliance: preset.label,
      powerW: preset.defaultW,
      hoursPerDay: preset.defaultHours,
    });
  };

  const onSave = async () => {
    setSaving(true);
    const artifact = await save("load-survey", { rows, computed: result });
    setSavedAt(artifact.updatedAt);
    setSaving(false);
  };

  const chartData = result.hourlyProfile.map((w, h) => ({ hour: `${h.toString().padStart(2, "0")}:00`, watts: Math.round(w) }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Load Survey Lab</h1>
        <p className="mt-1 text-sm text-ink-500">
          Build a 24-hour load profile by appliance. Outputs feed into PV Sizing and your capstone.
        </p>
      </header>

      <section className="grid gap-3">
        <div className="overflow-x-auto rounded-lg border border-ink-300/40">
          <table className="min-w-full text-sm">
            <thead className="bg-brand-50/60 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-2 py-2">Class</th>
                <th className="px-2 py-2">Appliance</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">W</th>
                <th className="px-2 py-2">h/day</th>
                <th className="px-2 py-2">Coinc.</th>
                <th className="px-2 py-2">Season</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/30">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1">
                    <select
                      className="w-full rounded border-ink-300 bg-white p-1 text-xs"
                      value={r.customerClass}
                      onChange={(e) => updateRow(r.id, { customerClass: e.target.value as CustomerClass })}
                    >
                      {CUSTOMER_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      className="w-full rounded border-ink-300 bg-white p-1 text-xs"
                      value={r.applianceClass}
                      onChange={(e) => onApplianceChange(r.id, e.target.value as ApplianceClass)}
                    >
                      {APPLIANCE_PRESETS.map((p) => <option key={p.class} value={p.class}>{p.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1"><NumInput value={r.quantity} onChange={(v) => updateRow(r.id, { quantity: v })} min={0} /></td>
                  <td className="px-2 py-1"><NumInput value={r.powerW} onChange={(v) => updateRow(r.id, { powerW: v })} min={0} /></td>
                  <td className="px-2 py-1"><NumInput value={r.hoursPerDay} onChange={(v) => updateRow(r.id, { hoursPerDay: v })} min={0} step={0.5} /></td>
                  <td className="px-2 py-1"><NumInput value={r.coincidenceFactor} onChange={(v) => updateRow(r.id, { coincidenceFactor: v })} min={0} max={1} step={0.05} /></td>
                  <td className="px-2 py-1"><NumInput value={r.seasonalFactor} onChange={(v) => updateRow(r.id, { seasonalFactor: v })} min={0} max={1.5} step={0.05} /></td>
                  <td className="px-2 py-1 text-right">
                    <button className="text-xs text-ink-500 hover:text-red-700" onClick={() => removeRow(r.id)} aria-label="Remove row">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary" onClick={addRow}>+ Add appliance row</button>
          <button className="btn-primary" onClick={onSave} disabled={saving || rows.length === 0}>
            {saving ? "Saving…" : "Save artifact"}
          </button>
          {savedAt && <span className="self-center text-xs text-ink-500">Saved at {new Date(savedAt).toLocaleString()}</span>}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Daily energy" value={`${(result.dailyWh / 1000).toFixed(1)} kWh`} />
        <Metric label="Coincident peak" value={`${(result.peakW / 1000).toFixed(2)} kW`} />
        <Metric label="Hourly peak (profile)" value={`${(Math.max(...result.hourlyProfile) / 1000).toFixed(2)} kW`} />
      </section>

      <section className="card">
        <h2 className="font-semibold">24-hour profile</h2>
        <p className="text-xs text-ink-500">Average watts per hour based on appliance-class presets.</p>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0e9f6e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0e9f6e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" interval={3} stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(1)} kW`} stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${(v / 1000).toFixed(2)} kW`} />
              <Area type="monotone" dataKey="watts" stroke="#0e9f6e" fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {result.warnings.length > 0 && (
        <section className="card border-amber-300 bg-amber-50/40">
          <h2 className="font-semibold text-amber-900">Demand-risk notes</h2>
          <ul className="mt-2 grid gap-1 text-sm text-amber-900">
            {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold">By customer class</h2>
        <ul className="mt-2 grid gap-1 text-sm">
          {Object.entries(result.byClass).map(([k, v]) => (
            <li key={k} className="flex justify-between">
              <span>{k}</span>
              <span className="text-ink-500">{(v.dailyWh / 1000).toFixed(1)} kWh · peak {(v.peakW / 1000).toFixed(2)} kW</span>
            </li>
          ))}
          {Object.keys(result.byClass).length === 0 && <li className="text-ink-500">Add rows to see a breakdown.</li>}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      className="w-20 rounded border border-ink-300 p-1 text-xs"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}
