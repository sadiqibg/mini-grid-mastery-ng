// PV Sizing Lab — pure compute logic.

export type SystemVoltage = 12 | 24 | 48 | 96 | 240 | 400;

export type PvSizingInputs = {
  dailyDemandWh: number;
  psh: number;
  derating: number;        // 0..1, e.g. 0.75
  moduleW: number;
  systemVoltage: SystemVoltage;
  autonomyDays: number;
  batteryChemistry: "lead-acid" | "lfp";
  inverterMaxInputV: number; // controller / hybrid inverter ceiling
  voc: number;              // module Voc at STC
  vocColdMultiplier: number; // e.g. 1.18 for harmattan-morning Voc check
};

export type PvSizingResult = {
  arrayWp: number;
  moduleCount: number;
  arrayActualWp: number;
  dod: number;
  batteryNameplateWh: number;
  batteryNameplateAh: number;
  modulesPerString: number;
  totalStrings: number;
  stringVocCold: number;
  warnings: string[];
  notes: string[];
};

export function computePvSizing(input: PvSizingInputs): PvSizingResult {
  const warnings: string[] = [];
  const notes: string[] = [];

  const dod = input.batteryChemistry === "lfp" ? 0.8 : 0.5;

  // Required PV (Wp) to meet daily energy through realistic losses.
  const arrayWp = input.dailyDemandWh / Math.max(input.psh * input.derating, 0.01);

  const moduleCount = Math.ceil(arrayWp / Math.max(input.moduleW, 1));
  const arrayActualWp = moduleCount * input.moduleW;

  // Battery sizing
  const batteryNameplateWh = (input.dailyDemandWh * input.autonomyDays) / Math.max(dod, 0.01);
  const batteryNameplateAh = batteryNameplateWh / Math.max(input.systemVoltage, 1);

  // String sizing: pack as many modules per string as the controller voltage allows
  // when checked against the cold-morning Voc multiplier.
  const maxModulesPerString = Math.max(1, Math.floor(input.inverterMaxInputV / (input.voc * input.vocColdMultiplier)));
  const modulesPerString = Math.min(moduleCount, maxModulesPerString);
  const totalStrings = Math.ceil(moduleCount / modulesPerString);
  const stringVocCold = modulesPerString * input.voc * input.vocColdMultiplier;

  // Warnings
  if (input.derating > 0.85) {
    warnings.push(`Derating ${input.derating.toFixed(2)} is optimistic for Nigerian conditions; 0.72–0.80 is typical.`);
  }
  if (input.derating < 0.65) {
    warnings.push(`Derating ${input.derating.toFixed(2)} is very conservative; you may oversize the array.`);
  }
  if (input.autonomyDays > 2.5 && input.batteryChemistry === "lead-acid") {
    warnings.push(`${input.autonomyDays} days autonomy on lead-acid means a very deep cycle. LFP is usually better above 1.5 days autonomy.`);
  }
  if (stringVocCold > input.inverterMaxInputV) {
    warnings.push(`Computed string Voc on a cold morning (${Math.round(stringVocCold)} V) exceeds controller max input (${input.inverterMaxInputV} V). Reduce modules-per-string.`);
  }
  if (input.systemVoltage <= 48 && batteryNameplateWh > 50000) {
    warnings.push(`A ${input.systemVoltage} V battery bus carrying ${Math.round(batteryNameplateAh)} Ah is unworkable. Move to a high-voltage hybrid inverter architecture.`);
  }
  if (input.psh < 4) {
    warnings.push(`PSH ${input.psh} is very low for any Nigerian zone — verify your resource data.`);
  }

  // Notes
  notes.push(`Battery DoD assumed: ${(dod * 100).toFixed(0)}% (${input.batteryChemistry}).`);
  notes.push(`String design: ${totalStrings} string(s) of ${modulesPerString} module(s); cold-morning Voc per string ≈ ${Math.round(stringVocCold)} V.`);

  return {
    arrayWp,
    moduleCount,
    arrayActualWp,
    dod,
    batteryNameplateWh,
    batteryNameplateAh,
    modulesPerString,
    totalStrings,
    stringVocCold,
    warnings,
    notes,
  };
}

export const PSH_PRESETS: Array<{ label: string; value: number }> = [
  { label: "Far north (Sokoto / Katsina / Yobe) — 5.8", value: 5.8 },
  { label: "Middle belt (Abuja / Jos / Kaduna) — 5.2", value: 5.2 },
  { label: "South-west (Lagos / Ibadan) — 4.8", value: 4.8 },
  { label: "South-east / Niger Delta — 4.3", value: 4.3 },
];
