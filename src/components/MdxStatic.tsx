// Pure-display MDX helpers. No client interactivity — usable directly inside RSCs.

import type { ReactNode } from "react";

export function Callout({ tone = "info", children }: { tone?: "info" | "warning" | "success"; children: ReactNode }) {
  const cls =
    tone === "warning" ? "bg-amber-50 border-amber-300 text-amber-900"
    : tone === "success" ? "bg-brand-50 border-brand-500 text-brand-900"
    : "bg-blue-50 border-blue-300 text-blue-900";
  return <div className={`my-4 rounded-md border-l-4 p-4 text-sm ${cls}`}>{children}</div>;
}

export function RegulationAlert({ children }: { children: ReactNode }) {
  return (
    <Callout tone="warning">
      <strong>Regulation changed:</strong> {children}
    </Callout>
  );
}

export function NigerianExample({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-md border border-brand-500/30 bg-brand-50/50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase text-brand-700">Nigerian field example</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
