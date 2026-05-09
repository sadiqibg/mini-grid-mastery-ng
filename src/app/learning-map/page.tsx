"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { MODULES_IN_ORDER } from "@/lib/xp";

const TITLES: Record<string, string> = {
  "00-onboarding": "Onboarding",
  "01-nigeria-electricity": "Nigeria Electricity",
  "02-load-and-solar": "Load & Solar",
  "03-pv-components": "PV Components",
  "04-hybrid-topologies": "Hybrid Topologies",
  "05-sizing-boq-protection": "Sizing, BoQ & O&M",
  "06-regulation-finance": "Regulation & Finance",
  "07-site-selection": "Site Selection",
  "08-simulation": "Simulation",
  "09-capstone": "Capstone",
};

export default function LearningMap() {
  const completed = useStore((s) => s.completedModules());
  const isUnlocked = useStore((s) => s.isModuleUnlocked);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Learning map</h1>
        <p className="mt-1 text-sm text-ink-500">Each module unlocks the next. The capstone integrates everything.</p>
      </div>

      <ol className="relative grid gap-4 border-l border-ink-300/50 pl-6">
        {MODULES_IN_ORDER.map((slug, i) => {
          const unlocked = isUnlocked(slug);
          const done = completed.has(slug);
          return (
            <li key={slug} className="relative">
              <span className={`absolute -left-[33px] top-2 h-3 w-3 rounded-full ring-4 ring-white ${done ? "bg-brand-600" : unlocked ? "bg-brand-300" : "bg-ink-300"}`} />
              <Link
                href={unlocked ? `/modules/${slug}` : "#"}
                className={`block card transition ${unlocked ? "hover:border-brand-500" : "opacity-50 cursor-not-allowed"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase text-ink-500">Step {i + 1}</p>
                  <span className={`text-xs ${done ? "text-brand-700" : "text-ink-500"}`}>
                    {done ? "Complete" : unlocked ? "Open" : "Locked"}
                  </span>
                </div>
                <p className="mt-1 font-semibold">{TITLES[slug]}</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
