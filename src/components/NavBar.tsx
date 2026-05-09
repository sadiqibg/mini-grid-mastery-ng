"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function NavBar() {
  const totalXp = useStore((s) => s.totalXp());
  const rank = useStore((s) => s.rank());
  const identity = useStore((s) => s.identity);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-300/40 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block h-6 w-6 rounded bg-brand-600" aria-hidden />
          <span>Mini-Grid Mastery <span className="text-brand-600">NG</span></span>
        </Link>
        <nav className="hidden gap-1 sm:flex">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/learning-map">Learning map</NavLink>
          <NavLink href="/portfolio">Portfolio</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
        {identity && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink-500 sm:inline">{rank.label}</span>
            <span className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">{totalXp} XP</span>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="rounded-md px-3 py-1.5 text-sm text-ink-700 hover:bg-brand-50" href={href}>
      {children}
    </Link>
  );
}
