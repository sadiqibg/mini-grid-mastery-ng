"use client";

import { useStore } from "@/lib/store";
import type { CapstoneSectionState } from "@/lib/storage";

const SECTIONS: { id: string; label: string }[] = [
  { id: "executive_summary", label: "1. Executive summary" },
  { id: "community_profile", label: "2. Community profile" },
  { id: "demand_assessment", label: "3. Demand assessment" },
  { id: "load_profile", label: "4. Load profile" },
  { id: "solar_resource", label: "5. Solar resource & site assessment" },
  { id: "technical_design", label: "6. Technical design concept" },
  { id: "topology_choice", label: "7. Hybrid topology choice" },
  { id: "sld_interpretation", label: "8. SLD interpretation" },
  { id: "sizing", label: "9. Preliminary sizing" },
  { id: "boq", label: "10. BoQ" },
  { id: "protection_metering", label: "11. Protection & metering plan" },
  { id: "commissioning", label: "12. Commissioning plan" },
  { id: "om_plan", label: "13. O&M plan" },
  { id: "regulatory_pathway", label: "14. Regulatory pathway" },
  { id: "community_engagement", label: "15. Community engagement & HCA plan" },
  { id: "financial_model", label: "16. Financial model" },
  { id: "tariff_logic", label: "17. Tariff logic" },
  { id: "funding_pathway", label: "18. Funding pathway" },
  { id: "schedule", label: "19. Project schedule" },
  { id: "risk_register", label: "20. Risk register" },
  { id: "simulation_inputs", label: "21. Simulation inputs" },
  { id: "final_recommendation", label: "22. Final recommendation" },
];

const STATUSES: CapstoneSectionState["status"][] = ["not_started", "drafting", "complete"];

export default function CapstonePage() {
  const capstone = useStore((s) => s.capstone);
  const setSection = useStore((s) => s.setCapstoneSection);

  const completeCount = SECTIONS.filter((s) => capstone[s.id]?.status === "complete").length;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Capstone Studio</h1>
        <p className="mt-2 text-sm text-ink-500">
          Track each of the 22 sections of your project development package. Submitting a lab artifact
          will eventually auto-flip the matching section. For now, mark status manually as you build.
        </p>
        <p className="mt-2 text-sm font-semibold">{completeCount} / {SECTIONS.length} complete</p>
      </div>

      <ul className="grid gap-2">
        {SECTIONS.map((s) => {
          const status = capstone[s.id]?.status ?? "not_started";
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 card">
              <p className="font-medium">{s.label}</p>
              <div className="flex gap-1">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    className={`rounded-md px-2.5 py-1 text-xs ${status === st ? "bg-brand-600 text-white" : "bg-ink-300/20 text-ink-700 hover:bg-brand-50"}`}
                    onClick={() => void setSection(s.id, st)}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
