// Regulatory Decision Tree logic for the 2026 NERC framework.

export type RegAnswers = {
  interconnect?: "isolated" | "interconnected";
  capacity?: number;
  "state-serc"?: "yes" | "no";
  land?: "yes" | "no";
  imports?: "yes" | "no";
};

export type RegOutput = {
  regulator: "NERC" | "SERC";
  pathway: "registration" | "permit" | "not-permitted";
  tripartiteRequired: boolean;
  discoClockDays: number | null;
  nemsaInspection: true;
  importConformity: "SONCAP" | "MANCAP" | "MANCAP-or-mixed";
  corenRequired: boolean;
  hcaRequired: true;
  documentsAlways: string[];
  warnings: string[];
  summary: string;
};

const ALWAYS_DOCS = [
  "Single-line diagram",
  "Bill of Quantities (5 categories)",
  "Protection & earthing plan",
  "Metering plan",
  "Commissioning plan",
  "O&M plan",
  "Environmental screening (NESREA if site is sensitive)",
];

export function derivePathway(a: RegAnswers): RegOutput | null {
  if (!a.interconnect || a.capacity === undefined || a["state-serc"] === undefined) return null;

  const warnings: string[] = [];
  const capacity = a.capacity;

  // Regulator: SERC has primary authority for *intrastate isolated* systems where it's operational.
  const regulator: "NERC" | "SERC" =
    a.interconnect === "isolated" && a["state-serc"] === "yes" ? "SERC" : "NERC";

  // Capacity bounds under 2026 framework
  const max = a.interconnect === "isolated" ? 5000 : 10000;
  let pathway: RegOutput["pathway"];
  if (capacity > max) {
    pathway = "not-permitted";
    warnings.push(`Capacity ${capacity} kW exceeds the 2026 ${a.interconnect} mini-grid cap (${max} kW).`);
  } else if (capacity <= 100) {
    pathway = "registration";
  } else {
    pathway = "permit";
  }

  const tripartiteRequired = a.interconnect === "interconnected";
  const discoClockDays = a.interconnect === "interconnected" ? 15 : null;

  // COREN threshold is the design-engineering threshold; for practical purposes any permit-pathway
  // project has detailed electrical design above that threshold.
  const corenRequired = capacity > 100;

  if (a.land === "no") {
    warnings.push("Land rights are informal — secure written agreement + community access rights before submitting.");
  }
  if (a.imports === undefined) {
    warnings.push("Confirm import status to know whether SONCAP applies.");
  }

  const importConformity: RegOutput["importConformity"] =
    a.imports === "yes" ? "SONCAP" : a.imports === "no" ? "MANCAP" : "MANCAP-or-mixed";

  const summary = [
    `${regulator} ${pathway === "registration" ? "registration" : pathway === "permit" ? "permit" : "out-of-scope"} pathway`,
    tripartiteRequired ? "Tripartite Agreement + 15-business-day DisCo clock" : "no Tripartite Agreement needed",
    corenRequired ? "COREN-signed design required" : "below COREN threshold",
    a.imports === "yes" ? "SONCAP on imports" : "MANCAP on local manufacture",
  ].join(" · ");

  return {
    regulator,
    pathway,
    tripartiteRequired,
    discoClockDays,
    nemsaInspection: true,
    importConformity,
    corenRequired,
    hcaRequired: true,
    documentsAlways: ALWAYS_DOCS,
    warnings,
    summary,
  };
}
