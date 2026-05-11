import { describe, expect, it } from "vitest";
import { reviewCard, isDue } from "@/lib/srs";

describe("SM-2-lite scheduler", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("first review with 'good' schedules ~2 days out", () => {
    const next = reviewCard(undefined, 2, "card-1");
    expect(next.intervalDays).toBe(2);
    expect(next.ease).toBeCloseTo(2.5, 5);
    expect(next.dueOn > today).toBe(true);
  });

  it("first review with 'again' keeps interval at 0 and lowers ease", () => {
    const next = reviewCard(undefined, 0, "card-1");
    expect(next.intervalDays).toBe(0);
    expect(next.ease).toBeCloseTo(2.3, 5);
    expect(next.dueOn).toBe(today);
  });

  it("ease floors at 1.3", () => {
    let s = reviewCard(undefined, 0, "x");
    for (let i = 0; i < 20; i++) s = reviewCard(s, 0, "x");
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("ease ceilings at 2.8", () => {
    let s = reviewCard(undefined, 3, "x");
    for (let i = 0; i < 20; i++) s = reviewCard(s, 3, "x");
    expect(s.ease).toBeLessThanOrEqual(2.8);
  });

  it("'easy' grows interval faster than 'good'", () => {
    const seed = reviewCard(undefined, 2, "x"); // good first → interval 2
    const good = reviewCard(seed, 2, "x");
    const easy = reviewCard(seed, 3, "x");
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });

  it("isDue is true for new cards and overdue cards", () => {
    expect(isDue(undefined)).toBe(true);
    expect(isDue({ cardId: "x", ease: 2.5, intervalDays: 0, dueOn: "2000-01-01" })).toBe(true);
    expect(isDue({ cardId: "x", ease: 2.5, intervalDays: 0, dueOn: "2999-01-01" })).toBe(false);
  });
});
