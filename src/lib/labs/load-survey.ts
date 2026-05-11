// Load Survey Lab — pure compute logic. UI lives in src/app/labs/load-survey.

export type CustomerClass = "domestic" | "shop" | "productive" | "public" | "religious";

export type ApplianceClass = "lighting" | "phone" | "tv" | "fan" | "fridge" | "ac" | "kettle" | "iron" | "mill" | "welder" | "pump" | "coldroom" | "other";

export type LoadRow = {
  id: string;
  customerClass: CustomerClass;
  applianceClass: ApplianceClass;
  appliance: string;
  quantity: number;
  powerW: number;
  hoursPerDay: number;
  coincidenceFactor: number; // 0..1
  seasonalFactor: number;    // 0..1
};

export type LoadSurveyResult = {
  dailyWh: number;
  peakW: number;
  byClass: Record<CustomerClass, { dailyWh: number; peakW: number }>;
  hourlyProfile: number[]; // 24 entries, watts at each hour
  warnings: string[];
};

// Default hour-of-use distributions per appliance class.
// Numbers sum to 1.0; they describe what fraction of the appliance's daily
// energy is consumed in each hour. Learners can override on a real lab.
const HOURLY_PRESETS: Record<ApplianceClass, number[]> = {
  // Heavy at evening
  lighting: [0,0,0,0,0,0.02,0.04,0.02,0,0,0,0,0,0,0,0,0,0.08,0.18,0.22,0.20,0.12,0.08,0.04],
  tv:       [0,0,0,0,0,0,0.02,0.04,0.02,0,0,0,0,0,0,0,0.04,0.08,0.18,0.20,0.18,0.14,0.08,0.02],
  fan:      [0.02,0.02,0.02,0.02,0.02,0.02,0.04,0.04,0.04,0.04,0.04,0.05,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.04,0.04,0.02],
  // Steady through the day (cold)
  fridge:   [0.03,0.03,0.03,0.03,0.03,0.04,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.04,0.04,0.04,0.04],
  coldroom: [0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04],
  // Midday productive
  mill:     [0,0,0,0,0,0,0,0.05,0.10,0.15,0.20,0.20,0.15,0.10,0.05,0,0,0,0,0,0,0,0,0],
  welder:   [0,0,0,0,0,0,0,0.05,0.10,0.15,0.20,0.15,0.10,0.10,0.10,0.05,0,0,0,0,0,0,0,0],
  pump:     [0,0,0,0,0,0,0.10,0.20,0.20,0.15,0.10,0.05,0,0,0,0,0,0,0.05,0.10,0.05,0,0,0],
  // Morning + evening
  kettle:   [0,0,0,0,0,0.10,0.20,0.20,0.10,0,0,0,0.05,0.05,0,0,0,0.05,0.10,0.10,0.05,0,0,0],
  iron:     [0,0,0,0,0,0.05,0.20,0.25,0.15,0.05,0,0,0,0,0,0,0,0.05,0.10,0.10,0.05,0,0,0],
  // Spread across the day
  phone:    [0,0,0,0,0,0.02,0.04,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.04,0.04,0.02,0.02],
  ac:       [0,0,0,0,0,0,0,0,0,0,0.06,0.08,0.10,0.10,0.10,0.10,0.10,0.10,0.08,0.08,0.06,0.04,0,0],
  other:    [0,0,0,0,0,0.03,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.06,0.06,0.06,0.04,0.03,0.02],
};

export function computeLoadSurvey(rows: LoadRow[]): LoadSurveyResult {
  // hourlyEnergyWh[h] = Wh consumed in hour h ≈ average watts during hour h
  const hourlyEnergyWh = new Array(24).fill(0) as number[];
  // hourlyPeakW[h] = instantaneous coincident demand at hour h. Built by spreading each row's
  // coincident peak (qty * power * coincidence) across the day using the preset shape — rows
  // that don't run at hour h contribute nothing, so peaks from different appliance classes
  // only stack when they actually overlap in time.
  const hourlyPeakW = new Array(24).fill(0) as number[];
  const byClass: Record<string, { dailyWh: number; peakW: number }> = {};
  const warnings: string[] = [];

  let dailyWh = 0;

  for (const r of rows) {
    if (r.quantity <= 0 || r.powerW <= 0 || r.hoursPerDay < 0) continue;
    const rowDailyWh = r.quantity * r.powerW * r.hoursPerDay * r.seasonalFactor;
    const rowPeakW = r.quantity * r.powerW * r.coincidenceFactor;

    dailyWh += rowDailyWh;

    const rawPreset = HOURLY_PRESETS[r.applianceClass] ?? HOURLY_PRESETS.other;
    // Normalise presets to sum to 1.0 so the hourly energy distribution preserves daily total
    // regardless of authoring rounding. presetMax (max of normalised) drives the peak shape.
    const presetSum = rawPreset.reduce((a, b) => a + b, 0) || 1;
    const preset = rawPreset.map((v) => v / presetSum);
    const presetMax = Math.max(...preset, 1e-9);

    let rowPeakAtAnyHour = 0;
    for (let h = 0; h < 24; h++) {
      hourlyEnergyWh[h] += rowDailyWh * preset[h];
      // Normalise preset so the row is at full coincident peak during its busiest hour
      // and proportionally less in surrounding hours. Honest way to combine intra-class
      // coincidence with inter-class time-of-day diversity.
      const rowPeakAtH = rowPeakW * (preset[h] / presetMax);
      hourlyPeakW[h] += rowPeakAtH;
      if (rowPeakAtH > rowPeakAtAnyHour) rowPeakAtAnyHour = rowPeakAtH;
    }

    if (!byClass[r.customerClass]) byClass[r.customerClass] = { dailyWh: 0, peakW: 0 };
    byClass[r.customerClass].dailyWh += rowDailyWh;
    byClass[r.customerClass].peakW += rowPeakAtAnyHour;

    // Per-row warnings.
    if (r.applianceClass === "welder" && r.coincidenceFactor > 0.5) {
      warnings.push(`Welders rarely run all at once — coincidence ${r.coincidenceFactor} for "${r.appliance}" looks high.`);
    }
    if (r.applianceClass === "mill" && r.powerW > 1500 && r.coincidenceFactor > 0.8) {
      warnings.push(`Motor surge risk on "${r.appliance}" — check inrush behaviour separately from steady-state.`);
    }
    if (r.hoursPerDay > 16) {
      warnings.push(`"${r.appliance}" runs ${r.hoursPerDay}h/day — verify this against metered data, surveys often overstate.`);
    }
  }

  if (rows.filter((r) => r.customerClass === "productive").length === 0 && rows.length > 0) {
    warnings.push("No productive-use rows in the survey — domestic-only profiles rarely make the unit economics work. Add at least one productive customer if you can.");
  }

  const peakW = Math.max(0, ...hourlyPeakW);

  return {
    dailyWh,
    peakW,
    byClass: byClass as LoadSurveyResult["byClass"],
    hourlyProfile: hourlyEnergyWh,
    warnings,
  };
}

export const APPLIANCE_PRESETS: Array<{ class: ApplianceClass; label: string; defaultW: number; defaultHours: number }> = [
  { class: "lighting", label: "LED bulbs (per household)", defaultW: 30, defaultHours: 5 },
  { class: "phone", label: "Phone charging (per household)", defaultW: 10, defaultHours: 3 },
  { class: "tv", label: "TV", defaultW: 80, defaultHours: 4 },
  { class: "fan", label: "Standing fan", defaultW: 60, defaultHours: 8 },
  { class: "fridge", label: "Domestic fridge", defaultW: 150, defaultHours: 24 },
  { class: "ac", label: "Split AC (1 HP)", defaultW: 900, defaultHours: 6 },
  { class: "kettle", label: "Electric kettle", defaultW: 1500, defaultHours: 0.5 },
  { class: "iron", label: "Clothes iron", defaultW: 1000, defaultHours: 0.5 },
  { class: "mill", label: "Grain / pepper mill", defaultW: 5500, defaultHours: 3 },
  { class: "welder", label: "Welder", defaultW: 4000, defaultHours: 2 },
  { class: "pump", label: "Water / irrigation pump", defaultW: 1500, defaultHours: 4 },
  { class: "coldroom", label: "Cold storage room", defaultW: 2500, defaultHours: 24 },
  { class: "other", label: "Other appliance", defaultW: 100, defaultHours: 2 },
];
