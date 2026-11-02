"use client";

// A notebook code cell: editable repo example code, runnable in the browser
// kernel, with expected output preview (from the repo) and per-cell autosave.

import { useCallback, useEffect, useState } from "react";
import { Play, RotateCcw, Loader2, ChevronRight, Eye, EyeOff } from "lucide-react";
import { kernel } from "@/lib/kernel/manager";
import { RunResultPayload } from "@/lib/kernel/protocol";
import { CodeEditor } from "./code-editor";
import { CellOutput } from "./cell-output";
import { useProgress } from "@/lib/store/progress";
import { cn } from "@/lib/utils";

interface CodeCellProps {
  cellKey: string;
  title: string;
  code: string;
  expectedOutput?: string[];
  packages: string[];
  seqRef: React.MutableRefObject<number>;
  onRan?: () => void;
  runRequestRef?: React.MutableRefObject<(() => void) | null>;
  readOnly?: boolean; // reference modules (TensorFlow) — study, don't execute
}

export function CodeCell({
  cellKey,
  title,
  code,
  expectedOutput,
  packages,
  seqRef,
  onRan,
  runRequestRef,
  readOnly = false,
}: CodeCellProps) {
  const stored = useProgress((s) => s.cellEdits[cellKey]);
  const setCellEdit = useProgress((s) => s.setCellEdit);
  const clearCellEdit = useProgress((s) => s.clearCellEdit);
  const recordCellRun = useProgress((s) => s.recordCellRun);
  const touchDay = useProgress((s) => s.touchDay);

  const [value, setValue] = useState(() => stored ?? code);
  const [result, setResult] = useState<RunResultPayload | null>(null);
  const [running, setRunning] = useState(false);
  const [showExpected, setShowExpected] = useState(readOnly);
  const [err, setErr] = useState<string | null>(null);
  const [ranFlash, setRanFlash] = useState(false);

  // NOTE: when the parent navigates to another concept the cell is remounted
  // via key={cellKey}, so state resets naturally — no reset effect needed.

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setErr(null);
    try {
      await kernel.ensurePackages(packages);
      const res = await kernel.runCell(value);
      setResult(res);
      seqRef.current += 1;
      recordCellRun(cellKey);
      touchDay();
      onRan?.();
      setRanFlash(true);
      setTimeout(() => setRanFlash(false), 750);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setRunning(false);
    }
  }, [running, packages, value, seqRef, recordCellRun, cellKey, touchDay, onRan]);

  useEffect(() => {
    if (runRequestRef) runRequestRef.current = run;
  }, [run, runRequestRef]);

  const dirty = stored !== undefined && stored !== code;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/60 overflow-hidden transition-shadow",
        ranFlash && "cell-ran"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/70 px-3.5 py-2">
        <span className="font-mono text-[10px] tracking-wider text-lab-dim uppercase">
          In
        </span>
        <span className="truncate text-[13px] font-medium text-foreground/90">
          {title}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {readOnly ? (
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              reference
            </span>
          ) : null}
          {expectedOutput && expectedOutput.length > 0 && (
            <button
              onClick={() => setShowExpected((s) => !s)}
              className="focus-ring inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Toggle the expected output recorded in the PyDocs reference"
            >
              {showExpected ? <EyeOff size={13} /> : <Eye size={13} />}
              <span className="hidden sm:inline">
                {showExpected ? "hide expected" : "expected"}
              </span>
            </button>
          )}
          {dirty && !readOnly && (
            <button
              onClick={() => {
                clearCellEdit(cellKey);
                setValue(code);
              }}
              className="focus-ring inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-amber-300/90 transition-colors hover:bg-accent"
              title="Restore the original PyDocs example code"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">reset</span>
            </button>
          )}
          {!readOnly && (
            <button
              onClick={run}
              disabled={running}
              className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md bg-primary/15 px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
            >
              {running ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              {running ? "running…" : "Run"}
            </button>
          )}
        </div>
      </div>

      <div className="px-1 py-1">
        <CodeEditor
          value={value}
          readOnly={readOnly}
          onChange={(v) => {
            setValue(v);
            setCellEdit(cellKey, v);
          }}
          onRunShortcut={run}
          ariaLabel={`Code cell: ${title}`}
        />
      </div>

      {showExpected && expectedOutput && expectedOutput.length > 0 && (
        <div className="border-t border-border/60 bg-secondary/30 px-3.5 py-2">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-lab-dim">
            Expected output (PyDocs)
          </div>
          <div className="pylab-terminal text-muted-foreground">
            {expectedOutput.join("\n")}
          </div>
        </div>
      )}

      <CellOutput result={result} />

      {err && (
        <div className="border-t border-border/60 bg-destructive/10 px-3.5 py-2 pylab-terminal text-xs text-red-300">
          {err}
        </div>
      )}
    </div>
  );
}

/** Small disclosure group used for repo notes between cells. */
export function NoteCallout({
  kind,
  text,
}: {
  kind: string;
  text: string;
}) {
  const isWarning = /warn/i.test(kind);
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed",
        isWarning
          ? "border-amber-500/25 bg-amber-500/8 text-amber-100/85"
          : "border-primary/25 bg-primary/8 text-emerald-100/85"
      )}
    >
      <ChevronRight size={14} className="mt-1 shrink-0 opacity-70" />
      <p>{text}</p>
    </div>
  );
}
