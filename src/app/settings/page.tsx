"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export default function Settings() {
  const identity = useStore((s) => s.identity);
  const meta = useStore((s) => s.meta);
  const setMeta = useStore((s) => s.setMeta);
  const reset = useStore((s) => s.resetAll);
  const cloud = useStore((s) => s.isCloudSyncEnabled);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!identity) return null;

  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="card">
        <h2 className="font-semibold">Recovery code</h2>
        <p className="mt-1 text-sm text-ink-500">
          Use this code on a fresh device to restore your progress. Treat it like a password —
          anyone with it can read your progress.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="rounded bg-brand-50 px-3 py-2 font-mono text-brand-700">{identity.recoveryCode}</code>
          <button
            className="btn-secondary"
            onClick={async () => {
              try { await navigator.clipboard.writeText(identity.recoveryCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {!cloud && (
          <p className="mt-2 text-xs text-amber-700">
            Cloud sync is off (no Supabase env vars set). The recovery code only restores within this browser until cloud sync is configured.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold">Display name</h2>
        <p className="mt-1 text-sm text-ink-500">Shown on the leaderboard if you opt in.</p>
        <input
          type="text"
          defaultValue={identity.displayName}
          className="mt-3 w-full rounded-md border border-ink-300 px-3 py-2"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== identity.displayName) {
              // Identity is mostly immutable except display name; mutate via setMeta keeping it in identity is overkill — store on meta is fine for v1.
              // For simplicity, rewrite identity locally.
              const next = { ...identity, displayName: v };
              import("@/lib/storage").then(({ localDb }) => localDb.setIdentity(next));
            }
          }}
        />
      </section>

      <section className="card">
        <h2 className="font-semibold">Leaderboard</h2>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={meta.leaderboardOptIn}
            onChange={(e) => void setMeta({ leaderboardOptIn: e.target.checked })}
          />
          Show me on the public leaderboard
        </label>
      </section>

      <section className="card border-red-500/40">
        <h2 className="font-semibold text-red-700">Reset progress</h2>
        <p className="mt-1 text-sm text-ink-500">
          This deletes your local progress, recovery code, and all artifacts. Cloud-stored data
          for the old code stays in Supabase but becomes unreachable from this browser.
        </p>
        {!confirmReset ? (
          <button className="btn-secondary mt-3" onClick={() => setConfirmReset(true)}>Reset…</button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              className="btn-primary bg-red-600 hover:bg-red-700"
              onClick={async () => { await reset(); setConfirmReset(false); }}
            >
              Yes, reset everything
            </button>
            <button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}
