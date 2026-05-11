"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { MODULES_IN_ORDER, RANKS } from "@/lib/xp";
import { BADGES } from "@/lib/badges";

const MODULE_LABELS: Record<string, string> = {
  "00-onboarding": "Onboarding & Diagnostic",
  "01-nigeria-electricity": "Nigeria Electricity & Mini-Grids",
  "02-load-and-solar": "Load, Demand & Solar Resource",
  "03-pv-components": "PV Components & Sizing",
  "04-hybrid-topologies": "Hybrid Topologies & SLDs",
  "05-sizing-boq-protection": "Hybrid Sizing, BoQ, Protection, O&M",
  "06-regulation-finance": "Regulation, Finance & Tariffs",
  "07-site-selection": "Site Selection & Project Development",
  "08-simulation": "Simulation & Optimisation",
  "09-capstone": "Capstone Studio",
};

export default function Dashboard() {
  const identity = useStore((s) => s.identity);
  const totalXp = useStore((s) => s.totalXp());
  const rank = useStore((s) => s.rank());
  const completed = useStore((s) => s.completedModules());
  const isUnlocked = useStore((s) => s.isModuleUnlocked);
  const earnedBadges = useStore((s) => s.badges);
  const meta = useStore((s) => s.meta);

  const nextModule = MODULES_IN_ORDER.find((m) => !completed.has(m));

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase text-ink-500">Current rank</p>
          <p className="mt-1 text-xl font-semibold">{rank.label}</p>
          <p className="mt-1 text-xs text-ink-500">
            {RANKS.indexOf(rank) + 1} of {RANKS.length}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-ink-500">Total XP</p>
          <p className="mt-1 text-xl font-semibold">{totalXp}</p>
          <p className="mt-1 text-xs text-ink-500">{earnedBadges.length} badge{earnedBadges.length === 1 ? "" : "s"} earned</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-ink-500">Next mission</p>
          <p className="mt-1 text-xl font-semibold">{nextModule ? MODULE_LABELS[nextModule] : "Capstone defense"}</p>
          {nextModule && (
            <Link className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline" href={`/modules/${nextModule}`}>
              Continue →
            </Link>
          )}
        </div>
      </div>

      {!meta.role && (
        <div className="card border-brand-500/40 bg-brand-50">
          <h3 className="font-semibold">Pick your learner role</h3>
          <p className="mt-1 text-sm text-ink-700">
            We use this to tailor missions. You can change it any time in Settings.
          </p>
          <RolePicker />
        </div>
      )}

      {meta.role && !meta.communityScenario && (
        <div className="card border-brand-500/40 bg-brand-50">
          <h3 className="font-semibold">Pick a Nigerian community scenario</h3>
          <p className="mt-1 text-sm text-ink-700">
            Lessons and labs reference "your community" — pick the case that will shape your capstone. You can switch later in Settings.
          </p>
          <ScenarioPicker />
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">Modules</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {MODULES_IN_ORDER.map((slug) => {
            const unlocked = isUnlocked(slug);
            const done = completed.has(slug);
            return (
              <li key={slug}>
                <Link
                  href={unlocked ? `/modules/${slug}` : "#"}
                  className={`block card transition ${unlocked ? "hover:border-brand-500" : "opacity-50 cursor-not-allowed"}`}
                  aria-disabled={!unlocked}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-ink-500">Module {slug.split("-")[0]}</p>
                      <p className="mt-1 font-semibold">{MODULE_LABELS[slug]}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${done ? "bg-brand-100 text-brand-700" : unlocked ? "bg-ink-300/20 text-ink-700" : "bg-ink-300/20 text-ink-500"}`}>
                      {done ? "Complete" : unlocked ? "Open" : "Locked"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Badges</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => {
            const earned = earnedBadges.includes(b.id);
            return (
              <li key={b.id} className={`card ${earned ? "" : "opacity-50"}`}>
                <p className="font-semibold">{b.label}</p>
                <p className="mt-1 text-sm text-ink-500">{b.description}</p>
                <p className="mt-2 text-xs uppercase text-brand-600">{earned ? "Earned" : "Locked"}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {identity && (
        <p className="text-xs text-ink-500">
          Profile: {identity.displayName} · code <span className="font-mono">{identity.recoveryCode}</span>
        </p>
      )}
    </div>
  );
}

const SCENARIOS: Array<{ id: string; label: string; blurb: string }> = [
  { id: "remote-agrarian", label: "Remote agrarian community", blurb: "Northern savannah, households + grain milling + irrigation. Seasonal demand." },
  { id: "diesel-retrofit", label: "Peri-urban diesel retrofit", blurb: "Market cluster, shops + cold storage + welders. Replacing a noisy genset." },
  { id: "riverine", label: "Riverine community", blurb: "Niger Delta / riverine belt. Cold storage for fish, access logistics, flood risk." },
  { id: "interconnected", label: "Interconnected DisCo feeder", blurb: "Underserved Band C community. Mixed loads. Tripartite Agreement on the table." },
];

function ScenarioPicker() {
  const setMeta = useStore((s) => s.setMeta);
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {SCENARIOS.map((s) => (
        <li key={s.id}>
          <button
            className="w-full rounded-lg border border-ink-300/40 bg-white p-3 text-left hover:border-brand-500"
            onClick={() => void setMeta({ communityScenario: s.id })}
          >
            <p className="font-semibold">{s.label}</p>
            <p className="mt-1 text-xs text-ink-500">{s.blurb}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RolePicker() {
  const setMeta = useStore((s) => s.setMeta);
  const roles: Array<{ id: "beginner" | "developer" | "technical" | "finance"; label: string }> = [
    { id: "beginner", label: "Beginner Learner" },
    { id: "developer", label: "Project Developer" },
    { id: "technical", label: "Technical Trainee" },
    { id: "finance", label: "Finance / Regulation" },
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {roles.map((r) => (
        <button key={r.id} className="btn-secondary" onClick={() => void setMeta({ role: r.id })}>
          {r.label}
        </button>
      ))}
    </div>
  );
}
