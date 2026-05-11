import { describe, expect, it } from "vitest";
import { rankFor, RANKS } from "@/lib/xp";

describe("rank progression", () => {
  it("returns Grid Novice when no modules are completed", () => {
    expect(rankFor(new Set()).id).toBe("grid-novice");
  });

  it("returns Energy Scout after completing Module 1", () => {
    expect(rankFor(new Set(["00-onboarding", "01-nigeria-electricity"])).id).toBe("energy-scout");
  });

  it("uses the highest rank reached, not just the most recent", () => {
    const completed = new Set([
      "00-onboarding",
      "01-nigeria-electricity",
      "02-load-and-solar",
      "03-pv-components",
    ]);
    expect(rankFor(completed).id).toBe("pv-builder");
  });

  it("Mini-Grid Expert is reachable", () => {
    const all = new Set(RANKS.map((r) => r.unlocksAfter));
    expect(rankFor(all).id).toBe("mini-grid-expert");
  });
});
