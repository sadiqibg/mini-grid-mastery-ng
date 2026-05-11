import { describe, expect, it } from "vitest";
import { derivePathway } from "@/lib/labs/regulatory-tree";

describe("derivePathway — 2026 framework", () => {
  it("returns null until interconnect + capacity + state-serc are answered", () => {
    expect(derivePathway({})).toBeNull();
    expect(derivePathway({ interconnect: "isolated" })).toBeNull();
    expect(derivePathway({ interconnect: "isolated", capacity: 80 })).toBeNull();
  });

  it("≤100 kW isolated in a SERC state → SERC registration, no Tripartite", () => {
    const r = derivePathway({ interconnect: "isolated", capacity: 80, "state-serc": "yes" })!;
    expect(r.regulator).toBe("SERC");
    expect(r.pathway).toBe("registration");
    expect(r.tripartiteRequired).toBe(false);
    expect(r.discoClockDays).toBeNull();
    expect(r.corenRequired).toBe(false);
  });

  it("750 kW isolated in a SERC state → SERC permit + COREN", () => {
    const r = derivePathway({ interconnect: "isolated", capacity: 750, "state-serc": "yes" })!;
    expect(r.regulator).toBe("SERC");
    expect(r.pathway).toBe("permit");
    expect(r.corenRequired).toBe(true);
  });

  it("interconnected always goes to NERC and triggers Tripartite + 15-day DisCo clock", () => {
    const r = derivePathway({ interconnect: "interconnected", capacity: 2000, "state-serc": "yes" })!;
    expect(r.regulator).toBe("NERC");
    expect(r.tripartiteRequired).toBe(true);
    expect(r.discoClockDays).toBe(15);
  });

  it("5 MW isolated is the cap; 5,001 kW is out of scope", () => {
    expect(derivePathway({ interconnect: "isolated", capacity: 5000, "state-serc": "yes" })!.pathway).toBe("permit");
    const over = derivePathway({ interconnect: "isolated", capacity: 5001, "state-serc": "yes" })!;
    expect(over.pathway).toBe("not-permitted");
    expect(over.warnings.some((w) => /5000 kW/.test(w))).toBe(true);
  });

  it("10 MW interconnected is the cap", () => {
    expect(derivePathway({ interconnect: "interconnected", capacity: 10000, "state-serc": "yes" })!.pathway).toBe("permit");
    expect(derivePathway({ interconnect: "interconnected", capacity: 10001, "state-serc": "yes" })!.pathway).toBe("not-permitted");
  });

  it("isolated falls back to NERC when state has no operational SERC", () => {
    const r = derivePathway({ interconnect: "isolated", capacity: 80, "state-serc": "no" })!;
    expect(r.regulator).toBe("NERC");
  });

  it("imports=yes → SONCAP; imports=no → MANCAP", () => {
    const base = { interconnect: "isolated" as const, capacity: 80, "state-serc": "yes" as const };
    expect(derivePathway({ ...base, imports: "yes" })!.importConformity).toBe("SONCAP");
    expect(derivePathway({ ...base, imports: "no" })!.importConformity).toBe("MANCAP");
  });

  it("warns about informal land tenure", () => {
    const r = derivePathway({ interconnect: "isolated", capacity: 200, "state-serc": "yes", land: "no" })!;
    expect(r.warnings.some((w) => /Land rights are informal/.test(w))).toBe(true);
  });

  it("NEMSA and HCA are required regardless", () => {
    const r = derivePathway({ interconnect: "isolated", capacity: 80, "state-serc": "yes" })!;
    expect(r.nemsaInspection).toBe(true);
    expect(r.hcaRequired).toBe(true);
  });
});
