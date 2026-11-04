"use client";

// Concept notebook view: authored explanation + the repo's own code examples
// as runnable cells + parameter tables + notes + the concept's exercise set.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Dumbbell,
  CheckCircle2,
  Circle,
  Lightbulb,
  ListChecks,
  Play,
  Loader2,
  Timer,
  Zap,
} from "lucide-react";
import {
  Concept,
  ContentBlock,
  Difficulty,
  Exercise,
} from "@/lib/content/types";
import { RegistryModule } from "@/lib/content/registry.generated";
import { CodeCell, NoteCallout } from "./code-cell";
import { Markdown } from "./markdown";
import { VisualBlock } from "./visuals";
import { NNPlayground } from "./nn-playground";
import { kernel, kernelForModule } from "@/lib/kernel/manager";
import { KernelStatusBadge } from "./kernel-badge";
import { useProgress } from "@/lib/store/progress";
import { navigate } from "@/lib/store/router";
import { cn } from "@/lib/utils";

const DIFF_STYLE: Record<Difficulty, string> = {
  easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  hard: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  expert: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export function DifficultyChip({ d }: { d: Difficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        DIFF_STYLE[d]
      )}
    >
      {d}
    </span>
  );
}

export function NotebookView({
  concept,
  moduleMeta,
}: {
  concept: Concept;
  moduleMeta: RegistryModule;
}) {
  const seqRef = useRef(0);
  const solved = useProgress((s) => s.solved);
  const visitConcept = useProgress((s) => s.visitConcept);
  const cellRuns = useProgress((s) => s.cellRuns);
  const exerciseSectionRef = useRef<HTMLDivElement>(null);
  const runRequestsRef = useRef<Record<string, (() => void) | null>>({});
  const [runAllBusy, setRunAllBusy] = useState(false);
  const cellKeys = useMemo(
    () => concept.blocks.map((_, i) => `${moduleMeta.id}/${concept.id}/${i}`),
    [concept, moduleMeta.id]
  );

  const cellKernel = kernelForModule(moduleMeta);
  const cellLanguage = moduleMeta.kernel === "tfjs" ? "javascript" : "python";

  useEffect(() => {
    visitConcept(moduleMeta.id, concept.id);
    cellKernel.boot();
    if (moduleMeta.runnable && moduleMeta.packages.length > 0) {
      kernel.ensurePackages(moduleMeta.packages).catch(() => {});
    }
  }, [concept.id, moduleMeta.id, moduleMeta.packages, moduleMeta.runnable, visitConcept, cellKernel]);

  const codeBlocks = concept.blocks.filter((b) => b.type === "code").length;
  const ranCells = cellKeys.filter((k) => (cellRuns[k] ?? 0) > 0).length;
  const solvedCount = concept.exercises.filter((e) => solved[e.id]).length;

  const runAll = async () => {
    if (runAllBusy) return;
    setRunAllBusy(true);
    try {
      for (let i = 0; i < concept.blocks.length; i++) {
        const b = concept.blocks[i];
        if (b.type === "code" || b.type === "playground") {
          const key = `${moduleMeta.id}/${concept.id}/${i}`;
          await new Promise<void>((resolve) => {
            const fn = runRequestsRef.current[key];
            if (!fn) return resolve();
            const orig = fn;
            // patch onRan for this invocation is complex; simply call and wait
            Promise.resolve(orig()).finally(resolve);
          });
        }
      }
    } finally {
      setRunAllBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6">
      {/* Breadcrumb + header */}
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`#/m/${moduleMeta.id}`}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ArrowLeft size={13} />
          {moduleMeta.name}
        </Link>
        <span className="text-lab-dim">/</span>
        <span className="font-medium text-foreground/80">
          {String(concept.num).padStart(2, "0")} · {concept.title}
        </span>
      </div>

      <div className="mb-5 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[27px]">
            <span className="mr-2 text-lab-dim">{String(concept.num).padStart(2, "0")}</span>
            {concept.title}
          </h1>
          {concept.intro && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {concept.intro}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <KernelStatusBadge target={cellKernel} />
          {codeBlocks > 0 && moduleMeta.runnable && (
            <button
              onClick={runAll}
              disabled={runAllBusy || !moduleMeta.runnable}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 text-xs font-semibold text-foreground/90 transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {runAllBusy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              Run all cells
            </button>
          )}
        </div>
      </div>

      {!moduleMeta.runnable && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <strong className="font-semibold">Reference module.</strong> This
          chapter is read-and-learn: study the code examples line by line with the
          explanation, then practice the same patterns in the runnable modules.
        </div>
      )}

      {/* Explanation */}
      {concept.explanation && (
        <section className="mb-8" aria-label="Concept explanation">
          <SectionTitle icon={<BookOpen size={15} />} label="Understand" />
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <Markdown text={concept.explanation} />
            {concept.keyPoints.length > 0 && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <ListChecks size={13} /> Key points to remember
                </div>
                <ul className="space-y-1.5">
                  {concept.keyPoints.map((kp, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/85">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary/80" />
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Lesson cells from the repo content */}
      {codeBlocks > 0 && (
        <section className="mb-8" aria-label="Code examples">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle icon={<Play size={15} />} label={moduleMeta.runnable ? "Learn by running the reference code" : "Study the reference code"} />
            <span className="font-mono text-[11px] text-lab-dim">
              {ranCells}/{cellKeys.filter((k, i) => ["code", "playground"].includes(concept.blocks[i].type)).length} cells run
            </span>
          </div>
          <div className="space-y-4">
            {concept.blocks.map((b, i) => (
              <BlockView
                key={i}
                block={b}
                cellKey={`${moduleMeta.id}/${concept.id}/${i}`}
                packages={moduleMeta.runnable ? moduleMeta.packages : []}
                readOnly={!moduleMeta.runnable}
                language={cellLanguage}
                cellKernel={cellKernel}
                seqRef={seqRef}
                runRequestsRef={runRequestsRef}
              />
            ))}
          </div>
        </section>
      )}

      {/* Exercises */}
      <section ref={exerciseSectionRef} aria-label="Exercises" className="scroll-mt-20">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle icon={<Dumbbell size={15} />} label={`Practice — ${concept.exercises.length} exercises`} />
          {concept.exercises.length > 0 && (
            <span className="font-mono text-[11px] text-lab-dim">
              {solvedCount}/{concept.exercises.length} solved
            </span>
          )}
        </div>
        {concept.exercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
            This reference concept has no executable exercises in the browser
            kernel. Continue to the next module to keep practicing.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {concept.exercises.map((ex, idx) => (
              <ExerciseCard key={ex.id} exercise={ex} index={idx} solved={!!solved[ex.id]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-foreground/70">
      <span className="text-primary">{icon}</span>
      {label}
    </h2>
  );
}

function BlockView({
  block,
  cellKey,
  packages,
  readOnly,
  language,
  cellKernel,
  seqRef,
  runRequestsRef,
}: {
  block: ContentBlock;
  cellKey: string;
  packages: string[];
  readOnly?: boolean;
  language?: "python" | "javascript";
  cellKernel?: ReturnType<typeof kernelForModule>;
  seqRef: React.MutableRefObject<number>;
  runRequestsRef: React.MutableRefObject<Record<string, (() => void) | null>>;
}) {
  if (block.type === "visual") {
    if (block.kind === "nn-playground") {
      return <NNPlayground />;
    }
    return (
      <VisualBlock kind={block.kind} spec={block.spec} text={block.text} title={block.title} />
    );
  }
  if (block.type === "code") {
    return (
      <CodeCell
        key={cellKey}
        cellKey={cellKey}
        readOnly={readOnly}
        title={block.title ?? "Example"}
        code={block.code ?? ""}
        expectedOutput={block.output}
        packages={packages}
        language={language}
        kernel={cellKernel}
        seqRef={seqRef}
        runRequestRef={{
          get current() {
            return runRequestsRef.current[cellKey] ?? null;
          },
          set current(v) {
            runRequestsRef.current[cellKey] = v;
          },
        }}
      />
    );
  }
  if (block.type === "playground") {
    return (
      <CodeCell
        key={cellKey}
        cellKey={cellKey}
        readOnly={readOnly}
        title="🧪 Playground — edit & run"
        code={block.code ?? ""}
        packages={packages}
        language={language}
        kernel={cellKernel}
        seqRef={seqRef}
        runRequestRef={{
          get current() {
            return runRequestsRef.current[cellKey] ?? null;
          },
          set current(v) {
            runRequestsRef.current[cellKey] = v;
          },
        }}
      />
    );
  }
  if (block.type === "note") {
    return <NoteCallout kind={block.kind ?? "note"} text={block.text ?? ""} />;
  }
  if (block.type === "params") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card/50">
        <div className="border-b border-border/70 bg-secondary/40 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
          Parameters — {block.title ?? ""}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-3.5 py-2 font-medium">Name</th>
                <th className="px-3.5 py-2 font-medium">Type</th>
                <th className="px-3.5 py-2 font-medium">Default</th>
                <th className="px-3.5 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {(block.rows ?? []).map((r, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="px-3.5 py-2 font-mono text-[11px] text-primary/90">{r[0]}</td>
                  <td className="px-3.5 py-2 font-mono text-[11px] text-muted-foreground">{r[1]}</td>
                  <td className="px-3.5 py-2 font-mono text-[11px] text-muted-foreground">{r[2]}</td>
                  <td className="px-3.5 py-2 text-foreground/80">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (block.type === "methods") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {(block.rows ?? []).map((r, i) => (
          <div key={i} className="rounded-lg border border-border bg-card/40 p-3">
            <code className="text-[12px] font-semibold text-primary/90">{r[0]}</code>
            <p className="mt-1 text-[12px] leading-relaxed text-foreground/75">{r[1]}</p>
            {r[2] && (
              <p className="mt-1 font-mono text-[10.5px] text-muted-foreground">→ {r[2]}</p>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "sig") {
    return (
      <div className="rounded-lg border border-border bg-lab-terminal/50 px-3.5 py-2.5 pylab-terminal text-[12px] text-emerald-200/90">
        {block.text}
      </div>
    );
  }
  return null;
}

function ExerciseCard({
  exercise,
  index,
  solved,
}: {
  exercise: Exercise;
  index: number;
  solved: boolean;
}) {
  return (
    <button
      onClick={() => navigate(`/x/${exercise.id}`)}
      className={cn(
        "focus-ring group relative overflow-hidden rounded-xl border p-4 text-left transition-all",
        solved
          ? "border-primary/40 bg-primary/8"
          : "border-border bg-card/50 hover:border-primary/40 hover:bg-card"
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        {solved ? (
          <CheckCircle2 size={16} className="shrink-0 text-primary" />
        ) : (
          <Circle size={16} className="shrink-0 text-lab-dim" />
        )}
        <span className="font-mono text-[10px] text-lab-dim">
          {String(index + 1).padStart(2, "0")}
        </span>
        <DifficultyChip d={exercise.difficulty} />
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-amber-300/90">
          <Zap size={11} /> {exercise.xp} XP
        </span>
      </div>
      <div className="font-semibold leading-snug text-foreground/95 group-hover:text-foreground">
        {exercise.title}
      </div>
      <div className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
        {exercise.story.replace(/[`*]/g, "")}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10.5px] text-lab-dim">
        <span className="inline-flex items-center gap-1">
          <ListChecks size={11} /> {exercise.tests.length} tests
        </span>
        <span className="inline-flex items-center gap-1">
          <Lightbulb size={11} /> {exercise.hints.length} hints
        </span>
        <span className="inline-flex items-center gap-1">
          <Timer size={11} /> {exercise.conceptsTested.slice(0, 3).join(" · ")}
        </span>
      </div>
    </button>
  );
}
