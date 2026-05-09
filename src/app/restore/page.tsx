"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidRecoveryCode } from "@/lib/identity";
import { restoreFromRecoveryCode } from "@/lib/sync";
import { useStore } from "@/lib/store";

export default function Restore() {
  const router = useRouter();
  const cloud = useStore((s) => s.isCloudSyncEnabled);
  const initStore = useStore((s) => s.init);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-2xl font-semibold">Restore your progress</h1>
      <p className="text-sm text-ink-500">
        Enter the 3-word code from your previous device. Format: <code className="font-mono">word-word-12</code>.
      </p>
      {!cloud && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Cloud sync is off in this deployment. Restore only works after Supabase is configured by the site operator.
        </div>
      )}
      <input
        autoFocus
        spellCheck={false}
        autoComplete="off"
        value={code}
        onChange={(e) => { setCode(e.target.value); setError(null); }}
        placeholder="e.g. plum-river-42"
        className="w-full rounded-md border border-ink-300 px-3 py-2 font-mono"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        className="btn-primary"
        disabled={busy || !cloud}
        onClick={async () => {
          setError(null);
          if (!isValidRecoveryCode(code)) { setError("That code's checksum doesn't match. Check your spelling."); return; }
          setBusy(true);
          try {
            const result = await restoreFromRecoveryCode(code);
            if (!result) {
              setError("No profile found for that code.");
            } else {
              await initStore();
              router.push("/dashboard");
            }
          } catch (e) {
            setError("Restore failed. Try again.");
          } finally { setBusy(false); }
        }}
      >
        {busy ? "Restoring…" : "Restore"}
      </button>
    </div>
  );
}
