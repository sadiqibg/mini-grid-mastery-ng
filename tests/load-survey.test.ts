import { describe, expect, it } from "vitest";
import { computeLoadSurvey, type LoadRow } from "@/lib/labs/load-survey";

const row = (overrides: Partial<LoadRow> = {}): LoadRow => ({
  id: "r" + Math.random(),
  customerClass: "domestic",
  applianceClass: "lighting",
  appliance: "LED bulbs",
  quantity: 10,
  powerW: 30,
  hoursPerDay: 5,
  coincidenceFactor: 0.6,
  seasonalFactor: 1.0,
  ...overrides,
});

describe("computeLoadSurvey", () => {
  it("returns zeros on empty input without crashing", () => {
    const r = computeLoadSurvey([]);
    expect(r.dailyWh).toBe(0);
    expect(r.peakW).toBe(0);
    expect(r.hourlyProfile).toHaveLength(24);
    expect(r.hourlyProfile.every((v) => v === 0)).toBe(true);
  });

  it("computes daily energy as qty × power × hours × seasonal (NOT coincidence)", () => {
    const r = computeLoadSurvey([row({ quantity: 10, powerW: 30, hoursPerDay: 5, seasonalFactor: 1, coincidenceFactor: 0.2 })]);
    expect(r.dailyWh).toBe(10 * 30 * 5 * 1); // coincidence does not affect daily energy
  });

  it("seasonal factor scales daily energy linearly", () => {
    const full = computeLoadSurvey([row({ seasonalFactor: 1 })]).dailyWh;
    const half = computeLoadSurvey([row({ seasonalFactor: 0.5 })]).dailyWh;
    expect(half).toBeCloseTo(full / 2, 5);
  });

  it("time-aware peak: lights (evening) and mills (midday) do not stack", () => {
    const lights = row({ applianceClass: "lighting", quantity: 100, powerW: 30, hoursPerDay: 5, coincidenceFactor: 0.5 });
    const mill   = row({ applianceClass: "mill",     quantity: 1,   powerW: 5000, hoursPerDay: 4, coincidenceFactor: 1.0 });

    const peakLightsAlone = computeLoadSurvey([lights]).peakW;
    const peakMillAlone   = computeLoadSurvey([mill]).peakW;
    const peakBoth        = computeLoadSurvey([lights, mill]).peakW;

    // The honest peak should be close to max of the two individual peaks, NOT their sum.
    expect(peakBoth).toBeLessThan(peakLightsAlone + peakMillAlone);
    // And at least as large as either alone.
    expect(peakBoth).toBeGreaterThanOrEqual(Math.max(peakLightsAlone, peakMillAlone) - 1);
  });

  it("flags missing productive use when there's any domestic load", () => {
    const r = computeLoadSurvey([row()]);
    expect(r.warnings.some((w) => /productive-use/i.test(w))).toBe(true);
  });

  it("does not flag missing productive use when survey is empty", () => {
    expect(computeLoadSurvey([]).warnings.length).toBe(0);
  });

  it("warns about high coincidence on welders", () => {
    const r = computeLoadSurvey([
      row({ applianceClass: "welder", customerClass: "productive", quantity: 4, powerW: 4000, hoursPerDay: 3, coincidenceFactor: 0.9 }),
    ]);
    expect(r.warnings.some((w) => /Welders/i.test(w))).toBe(true);
  });

  it("hourly profile sums to total daily Wh", () => {
    const r = computeLoadSurvey([
      row({ applianceClass: "lighting", quantity: 50, powerW: 30, hoursPerDay: 5 }),
      row({ applianceClass: "fridge", customerClass: "domestic", quantity: 5, powerW: 150, hoursPerDay: 24, coincidenceFactor: 0.8 }),
    ]);
    const sumHourly = r.hourlyProfile.reduce((s, v) => s + v, 0);
    expect(sumHourly).toBeCloseTo(r.dailyWh, 1);
  });

  it("by-class breakdown sums match totals", () => {
    const r = computeLoadSurvey([
      row({ customerClass: "domestic", applianceClass: "lighting", quantity: 50, powerW: 30, hoursPerDay: 5 }),
      row({ customerClass: "productive", applianceClass: "mill", quantity: 1, powerW: 5000, hoursPerDay: 3, coincidenceFactor: 1 }),
    ]);
    const classDaily = Object.values(r.byClass).reduce((s, v) => s + v.dailyWh, 0);
    expect(classDaily).toBeCloseTo(r.dailyWh, 1);
  });
});
