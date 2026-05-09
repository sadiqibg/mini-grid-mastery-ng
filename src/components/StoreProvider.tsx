"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  useEffect(() => { void init(); }, [init]);
  return <>{ready ? children : <BootSplash />}</>;
}

function BootSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 text-ink-700">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="mt-4 text-sm">Loading your learning state…</p>
      </div>
    </div>
  );
}
