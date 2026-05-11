import { describe, expect, it } from "vitest";
import { computePvSizing, type PvSizingInputs } from "@/lib/labs/pv-sizing";

const base: PvSizingInputs = {
  dailyDemandWh: 50_000,
  psh: 5.0,
  derating: 0.75,
  moduleW: 500,
  systemVoltage: 48,
  autonomyDays: 1.5,
  batteryChemistry: "lfp",
  inverterMaxInputV: 500,
  voc: 49.5,
  vocColdMultiplier: 1.18,
};

describe("computePvSizing", () => {
  it("array Wp = demand / (psh * derating)", () => {
    const r = computePvSizing(base);
    expect(r.arrayWp).toBeCloseTo(50_000 / (5.0 * 0.75), 1);
  });

  it("module count is the next-up integer", () => {
    const r = computePvSizing(base);
    expect(r.moduleCount).toBeGreaterThanOrEqual(Math.ceil(r.arrayWp / 500));
    expect(r.arrayActualWp).toBe(r.moduleCount * 500);
  });

  it("LFP DoD is 0.8; lead-acid is 0.5", () => {
    expect(computePvSizing({ ...base, batteryChemistry: "lfp" }).dod).toBe(0.8);
    expect(computePvSizing({ ...base, batteryChemistry: "lead-acid" }).dod).toBe(0.5);
  });

  it("battery nameplate Wh = demand × autonomy / DoD", () => {
    const r = computePvSizing({ ...base, autonomyDays: 1.5 });
    expect(r.batteryNameplateWh).toBeCloseTo((50_000 * 1.5) / 0.8, 1);
  });

  it("flags cold-Voc exceeding controller ceiling", () => {
    // Force a ceiling smaller than a single module's cold-morning Voc.
    // voc 49.5 × 1.18 = 58.41 V > 50 V controller → single-module string overflows.
    const r = computePvSizing({ ...base, inverterMaxInputV: 50 });
    expect(r.warnings.some((w) => /controller max input|cold morning/i.test(w))).toBe(true);
  });

  it("warns about deep autonomy on lead-acid", () => {
    const r = computePvSizing({ ...base, autonomyDays: 3, batteryChemistry: "lead-acid" });
    expect(r.warnings.some((w) => /lead-acid|LFP/i.test(w))).toBe(true);
  });

  it("warns about very low PSH", () => {
    const r = computePvSizing({ ...base, psh: 3 });
    expect(r.warnings.some((w) => /PSH/i.test(w))).toBe(true);
  });

  it("flags unworkable 48 V bus for very large battery", () => {
    const r = computePvSizing({ ...base, dailyDemandWh: 400_000, systemVoltage: 48 });
    expect(r.warnings.some((w) => /48 V battery bus|unworkable|high-voltage/i.test(w))).toBe(true);
  });

  it("flags optimistic derating > 0.85", () => {
    const r = computePvSizing({ ...base, derating: 0.9 });
    expect(r.warnings.some((w) => /derating/i.test(w) && /optimistic/i.test(w))).toBe(true);
  });
});
