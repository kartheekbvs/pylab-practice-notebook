'use client';

import dynamic from "next/dynamic";

// The whole practice platform is a client-side SPA (Pyodide kernel, editors,
// progress store) — disable SSR to avoid hydration mismatch with localStorage.
const PyLabApp = dynamic(
  () => import("@/components/pylab/app").then((m) => m.PyLabApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          booting PyLab…
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <PyLabApp />;
}
