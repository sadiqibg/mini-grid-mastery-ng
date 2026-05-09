"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function Home() {
  const identity = useStore((s) => s.identity);
  const totalXp = useStore((s) => s.totalXp());

  return (
    <div className="grid gap-12">
      <section className="grid items-center gap-8 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Mini-Grid Mastery NG</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Learn. Build. Defend. Operate.</h1>
          <p className="mt-4 text-lg text-ink-500">
            From electricity basics to a defensible Nigerian mini-grid project package — through
            practice labs, concept maps, and capstone-grade artifacts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">
              {totalXp > 0 ? "Continue learning" : "Start learning"}
            </Link>
            <Link href="/restore" className="btn-secondary">Restore progress</Link>
          </div>
          {identity && (
            <p className="mt-4 text-xs text-ink-500">
              Your local profile is active. Your recovery code is in <Link className="underline" href="/settings">Settings</Link>.
            </p>
          )}
        </div>
        <div className="card">
          <h2 className="text-base font-semibold">How this works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-700">
            <li>No sign-up. We generate an anonymous profile with a 3-word recovery code.</li>
            <li>Work through 9 modules: from Nigeria's electricity system to a capstone project.</li>
            <li>Practice in real labs — load survey, PV sizing, and the regulatory decision tree.</li>
            <li>Earn XP, ranks, and badges as you complete missions.</li>
            <li>Save your recovery code to pick up where you left off on any device.</li>
          </ol>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Tile title="9 modules" body="Onboarding, Nigeria electricity, load & solar, PV components, hybrid topology, sizing & BoQ, regulation & finance, site selection, simulation, capstone." />
        <Tile title="3 MVP labs" body="Load Survey, PV Sizing, and the Regulatory Decision Tree. Cross-linked — what you build flows into your portfolio and capstone." />
        <Tile title="PACER method" body="Procedural · Analogous · Conceptual · Evidence · Reference. Each lesson assigns the right kind of practice — concept maps you build yourself, never auto-graded." />
      </section>
    </div>
  );
}

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-ink-500">{body}</p>
    </div>
  );
}
