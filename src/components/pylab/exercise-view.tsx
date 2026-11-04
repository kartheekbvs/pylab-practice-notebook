"use client";

// Exercise workspace — HackerRank-style: problem panel (story, task, samples,
// hints) on one side, code editor + test runner on the other. Sample tests run
// instantly; Submit grades all tests including hidden ones and awards XP.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lock,
  Lightbulb,
  Loader2,
  Play,
  Send,
  RotateCcw,
  Zap,
  ChevronDown,
  PartyPopper,
  ArrowRight,
  Terminal,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import { ExerciseRef } from "@/lib/content";
import { Exercise } from "@/lib/content/types";
import { TestRunPayload } from "@/lib/kernel/protocol";
import { kernelForModule } from "@/lib/kernel/manager";
import { CodeEditor } from "./code-editor";
import { Markdown } from "./markdown";
import { DifficultyChip } from "./notebook-view";
import { useProgress } from "@/lib/store/progress";
import { navigate } from "@/lib/store/router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ExerciseView({ exerciseRef }: { exerciseRef: ExerciseRef }) {
  const { exercise: exercise, concept, module: moduleMeta } = exerciseRef;
  const solvedMap = useProgress((s) => s.solved);
  const hintsRevealedMap = useProgress((s) => s.hintsRevealed);
  const drafts = useProgress((s) => s.drafts);
  const setDraft = useProgress((s) => s.setDraft);
  const markSolved = useProgress((s) => s.markSolved);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const revealHintAction = useProgress((s) => s.revealHint);
  const touchDay = useProgress((s) => s.touchDay);

  const isSolved = !!solvedMap[exercise.id];
  const hintsRevealed = hintsRevealedMap[exercise.id] ?? 0;
  // TF/Keras exercises (lang "js") execute on the TensorFlow.js kernel
  const exKernel = kernelForModule(moduleMeta);
  const editorLang = exercise.lang === "js" ? "javascript" : "python";

  const [code, setCode] = useState(() => drafts[exercise.id] ?? exercise.starterCode);
  const [runResult, setRunResult] = useState<TestRunPayload | null>(null);
  const [submitResult, setSubmitResult] = useState<TestRunPayload | null>(null);
  const [running, setRunning] = useState<"none" | "run" | "submit">("none");
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Navigating to a different exercise remounts this view via key={exercise.id}
  // in the shell, so local state resets naturally — no reset effect needed.

  // preload module packages in the background
  useEffect(() => {
    exKernel.boot();
    if (moduleMeta.runnable && moduleMeta.packages.length > 0) {
      exKernel.ensurePackages(moduleMeta.packages).catch(() => {});
    }
  }, [moduleMeta, exKernel]);

  const grade = useCallback(
    async (mode: "run" | "submit") => {
      if (running !== "none") return;
      setRunning(mode);
      setError(null);
      if (mode === "run") setRunResult(null);
      else setSubmitResult(null);
      try {
        await exKernel.ensurePackages(moduleMeta.packages);
        // Sample runs grade ONLY the visible tests — hidden tests are sent
        // exclusively on Submit (HackerRank semantics).
        const spec =
          mode === "run"
            ? { bootstrap: exercise.bootstrap, tests: exercise.tests.filter((t) => !t.hidden) }
            : { bootstrap: exercise.bootstrap, tests: exercise.tests };
        const res = await exKernel.runTests(code, spec);
        touchDay();
        if (mode === "run") setRunResult(res);
        else {
          setSubmitResult(res);
          recordAttempt(exercise.id);
          if (res.status === "passed") {
            const hintsUsed = hintsRevealed;
            const first = markSolved(exercise.id, exercise.xp, hintsUsed);
            if (first) {
              toast.success(`+${exercise.xp} XP — ${exercise.title}`, {
                description: "Exercise solved. Keep the streak alive!",
              });
            }
            setCelebrate(true);
          }
        }
        setTimeout(
          () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
          80
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRunning("none");
      }
    },
    [running, moduleMeta, exKernel, code, touchDay, recordAttempt, exercise, hintsRevealed, markSolved]
  );

  const visibleTests = exercise.tests.filter((t) => !t.hidden);
  const shownResult = submitResult ?? runResult;
  const nextExercise = useMemo(() => {
    const idx = concept.exercises.findIndex((e) => e.id === exercise.id);
    return idx >= 0 && idx < concept.exercises.length - 1
      ? concept.exercises[idx + 1]
      : null;
  }, [concept.exercises, exercise.id]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      {/* Exercise header */}
      <div className="border-b border-border bg-card/40 px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <Link
            href={`#/m/${moduleMeta.id}/${concept.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> {concept.title}
          </Link>
          <span className="text-lab-dim">·</span>
          <h1 className="text-sm font-semibold text-foreground">{exercise.title}</h1>
          <DifficultyChip d={exercise.difficulty} />
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-300/90">
            <Zap size={11} /> {exercise.xp} XP
          </span>
          {isSolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <CheckCircle2 size={11} /> SOLVED
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ── Problem panel ── */}
        <div className="border-b border-border px-4 py-4 sm:px-6 lg:border-b-0 lg:border-r">
          <div className="max-h-none space-y-5 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2">
            <div>
              <SectionLabel icon={<Terminal size={13} />} label="The situation" />
              <Markdown text={exercise.story} />
            </div>
            <div>
              <SectionLabel icon={<ListChecks size={13} />} label="Your task" />
              <Markdown text={exercise.task} />
            </div>

            {exercise.constraints && exercise.constraints.length > 0 && (
              <div className="rounded-lg border border-border bg-card/40 p-3.5">
                <SectionLabel icon={<AlertTriangle size={13} />} label="Constraints & guarantees" />
                <ul className="mt-1.5 space-y-1">
                  {exercise.constraints.map((c, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                      <span className="text-lab-dim">•</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {exercise.examples.length > 0 && (
              <div>
                <SectionLabel icon={<Play size={13} />} label="Sample" />
                <div className="space-y-2">
                  {exercise.examples.map((ex, i) => (
                    <div key={i} className="overflow-hidden rounded-lg border border-border bg-card/40">
                      <div className="grid gap-0 sm:grid-cols-2">
                        <div className="border-b border-border/50 p-3 sm:border-b-0 sm:border-r">
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-lab-dim">Input</div>
                          <code className="pylab-terminal text-[12px] text-emerald-100/85">{ex.input}</code>
                        </div>
                        <div className="p-3">
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-lab-dim">Output</div>
                          <code className="pylab-terminal text-[12px] text-cyan-200/85">{ex.output}</code>
                        </div>
                      </div>
                      {ex.explanation && (
                        <div className="border-t border-border/50 bg-secondary/20 px-3 py-2 text-[12px] italic leading-relaxed text-muted-foreground">
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hints */}
            <div>
              <SectionLabel icon={<Lightbulb size={13} />} label={`Hints (${hintsRevealed}/${exercise.hints.length} revealed)`} />
              <div className="space-y-2">
                {exercise.hints.map((h, i) => {
                  const revealed = i < hintsRevealed;
                  return revealed ? (
                    <div key={i} className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3 text-[12.5px] leading-relaxed text-amber-100/90 fade-up">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400/80">
                        Hint {i + 1}
                      </span>
                      <p className="mt-0.5">{h}</p>
                    </div>
                  ) : (
                    <button
                      key={i}
                      onClick={() => {
                        const n = revealHintAction(exercise.id);
                        if (n === 1) toast.info("Hint revealed — it'll be noted on your solve record");
                      }}
                      disabled={hintsRevealed < i}
                      className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12px] text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-foreground disabled:opacity-40"
                    >
                      <Lightbulb size={13} /> Reveal hint {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card/30 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground/80">Signature:</strong>{" "}
              <code className="font-mono text-primary/90">{exercise.signature}</code>
              <div className="mt-1">
                Grading runs the exact same harness that validated this exercise
                offline: sample tests first, then {exercise.tests.filter((t) => t.hidden).length} hidden
                edge-case tests on Submit.
              </div>
            </div>
          </div>
        </div>

        {/* ── Editor panel ── */}
        <div className="flex flex-col px-4 py-4 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => grade("run")}
              disabled={running !== "none"}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary/70 px-3 text-xs font-semibold text-foreground/90 transition-colors hover:bg-secondary disabled:opacity-50"
              title="Run against the visible sample tests (Ctrl+Enter)"
            >
              {running === "run" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Run samples
            </button>
            <button
              onClick={() => grade("submit")}
              disabled={running !== "none"}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
              title="Submit — grade all tests including hidden (Ctrl+Shift+Enter)"
            >
              {running === "submit" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Submit
            </button>
            <button
              onClick={() => {
                setCode(exercise.starterCode);
                setDraft(exercise.id, exercise.starterCode);
                setRunResult(null);
                setSubmitResult(null);
              }}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              title="Reset to starter code"
            >
              <RotateCcw size={13} />
            </button>
            <span className="ml-auto hidden font-mono text-[10px] text-lab-dim sm:inline">
              Shift+Enter run · Ctrl+Enter submit
            </span>
          </div>

          <CodeEditor
            value={code}
            language={editorLang}
            onChange={(v) => {
              setCode(v);
              setDraft(exercise.id, v);
            }}
            onRunShortcut={() => grade("run")}
            onSubmitShortcut={() => grade("submit")}
            minHeight="260px"
            maxHeight="46vh"
            ariaLabel="Solution editor"
          />

          {/* Results */}
          <div ref={resultRef} className="mt-3 flex-1">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12.5px] text-red-200">
                {error}
              </div>
            )}
            {shownResult && (
              <TestResultsPanel
                result={shownResult}
                mode={submitResult ? "submit" : "run"}
                exercise={exercise}
              />
            )}
            {celebrate && submitResult?.status === "passed" && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 fade-up">
                <div className="flex items-center gap-3">
                  <PartyPopper className="text-primary" size={22} />
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      All tests passed — +{exercise.xp} XP!
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {submitResult.passed}/{submitResult.total} tests green ·{" "}
                      {submitResult.timeMs} ms
                    </div>
                  </div>
                </div>
                {nextExercise && (
                  <button
                    onClick={() => navigate(`/x/${nextExercise.id}`)}
                    className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground transition-all hover:brightness-110"
                  >
                    Next exercise <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/60">
      <span className="text-primary">{icon}</span>
      {label}
    </h2>
  );
}

export function TestResultsPanel({
  result,
  mode,
  exercise,
}: {
  result: TestRunPayload;
  mode: "run" | "submit";
  exercise: Exercise;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const visibleCount = exercise.tests.filter((t) => !t.hidden).length;
  const shown =
    mode === "run" ? result.results.filter((r) => !r.hidden) : result.results;

  if (result.status === "syntax-error" || result.status === "runtime-error" || result.status === "error") {
    return (
      <div className="overflow-hidden rounded-lg border border-red-500/30">
        <div className="flex items-center gap-2 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200">
          <XCircle size={14} /> {result.status === "syntax-error" ? "Syntax error" : "Runtime error"}
        </div>
        <pre className="pylab-terminal max-h-56 overflow-auto bg-lab-terminal/60 p-3 text-red-200/80">
          {result.userError || "Unknown error"}
        </pre>
      </div>
    );
  }

  const allPass = result.status === "passed";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border",
        allPass ? "border-primary/40" : "border-border"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-3 py-2 text-xs font-semibold",
          allPass ? "bg-primary/15 text-primary" : "bg-secondary/50 text-foreground/80"
        )}
      >
        {allPass ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-red-400" />}
        {mode === "run" ? "Sample tests" : "Submission"} — {result.passed}/{shown.length} passed
        {mode === "run" && (
          <span className="ml-auto font-normal text-muted-foreground">
            {visibleCount} sample · {exercise.tests.length - visibleCount} hidden
          </span>
        )}
        <span className="font-mono text-[10px] text-lab-dim">{result.timeMs} ms</span>
      </div>
      <div className="divide-y divide-border/40">
        {shown.map((r, i) => (
          <div key={i}>
            <button
              onClick={() => setExpanded((s) => ({ ...s, [i]: !s[i] }))}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent/40"
            >
              {r.passed ? (
                <CheckCircle2 size={14} className="shrink-0 text-primary" />
              ) : (
                <XCircle size={14} className="shrink-0 text-red-400" />
              )}
              <span className="text-[12.5px] font-medium text-foreground/90">{r.name}</span>
              {r.hidden && (
                <span className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-px font-mono text-[9px] uppercase text-lab-dim">
                  <Lock size={8} /> hidden
                </span>
              )}
              <span className="ml-auto font-mono text-[9.5px] uppercase text-lab-dim">{r.kind}</span>
              <ChevronDown
                size={13}
                className={cn("shrink-0 text-lab-dim transition-transform", expanded[i] && "rotate-180")}
              />
            </button>
            {expanded[i] && (
              <div className="space-y-1.5 bg-lab-terminal/30 px-3 py-2.5 fade-up">
                {!r.passed && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="mb-0.5 font-mono text-[9.5px] uppercase tracking-wider text-red-300/70">
                        Your output
                      </div>
                      <pre className="pylab-terminal max-h-32 overflow-auto rounded bg-red-500/8 p-2 text-[11px] text-red-100/85">
                        {r.actual || "—"}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-300/70">
                        Expected
                      </div>
                      <pre className="pylab-terminal max-h-32 overflow-auto rounded bg-primary/8 p-2 text-[11px] text-emerald-100/85">
                        {r.expected || "—"}
                      </pre>
                    </div>
                  </div>
                )}
                {r.message && !r.passed && (
                  <div className="text-[11.5px] text-amber-200/80">{r.message}</div>
                )}
                {r.explain && (
                  <div className="text-[11.5px] italic text-muted-foreground">{r.explain}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {result.stdout && result.status !== "passed" && (
        <div className="border-t border-border/40 px-3 py-2">
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider text-lab-dim">
            Your printed output
          </div>
          <pre className="pylab-terminal max-h-28 overflow-auto text-[11px] text-muted-foreground">
            {result.stdout}
          </pre>
        </div>
      )}
    </div>
  );
}
