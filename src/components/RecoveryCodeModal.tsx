"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";

export default function RecoveryCodeModal() {
  const show = useStore((s) => s.showRecoveryModal);
  const ack = useStore((s) => s.acknowledgeRecoveryCode);
  const code = useStore((s) => s.identity?.recoveryCode);
  const cloud = useStore((s) => s.isCloudSyncEnabled);
  const [copied, setCopied] = useState(false);

  if (!show || !code) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <div className="card w-full max-w-md">
        <h2 className="text-lg font-semibold">Save your recovery code</h2>
        <p className="mt-2 text-sm text-ink-500">
          This 3-word code is the only way to restore your progress on another device. Save it
          somewhere safe — there's no email reset.
        </p>
        <div className="mt-4 rounded-md bg-brand-50 px-4 py-3 text-center font-mono text-lg tracking-wide text-brand-700">
          {code}
        </div>
        {!cloud && (
          <p className="mt-3 text-xs text-amber-700">
            Cloud sync is currently disabled (no Supabase env vars). Until it's configured, this code only restores within this browser.
          </p>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="btn-secondary"
            onClick={async () => {
              try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn-primary" onClick={ack}>I've saved it</button>
        </div>
      </div>
    </div>
  );
}
