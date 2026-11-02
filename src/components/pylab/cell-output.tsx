"use client";

import { RunResultPayload } from "@/lib/kernel/protocol";

function TracebackView({ error }: { error: string }) {
  const lines = error.trim().split("\n");
  return (
    <div className="pylab-terminal text-red-300/90">
      {lines.map((l, i) => (
        <div key={i} className={l.startsWith("    ") ? "text-red-200/70" : ""}>
          {l}
        </div>
      ))}
    </div>
  );
}

export function CellOutput({ result }: { result: RunResultPayload | null }) {
  if (!result) return null;
  const hasStdout = result.stdout && result.stdout.length > 0;
  if (!hasStdout && !result.hasResult && !result.error && result.images.length === 0) {
    return null;
  }
  return (
    <div className="border-t border-lab-terminal-border/60 bg-lab-terminal/30 px-3.5 py-2.5 fade-up">
      {hasStdout && (
        <div className="pylab-terminal text-emerald-100/85">{result.stdout}</div>
      )}
      {result.images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`Plot output ${i + 1}`}
          className="my-2 max-w-full rounded border border-lab-terminal-border bg-white/95"
          style={{ maxHeight: 420 }}
        />
      ))}
      {result.error ? (
        <TracebackView error={result.error} />
      ) : result.hasResult && result.resultRepr !== undefined ? (
        <div className="pylab-terminal text-cyan-200/90">
          <span className="text-lab-dim">Out: </span>
          {result.resultRepr}
        </div>
      ) : null}
      <div className="mt-1 text-right font-mono text-[10px] text-lab-dim">
        {result.timeMs} ms
      </div>
    </div>
  );
}
