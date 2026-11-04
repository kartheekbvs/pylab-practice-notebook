"use client";

// Module overview: concept list with progress, exercise counts, difficulty mix.

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Circle, CheckCircle2 } from "lucide-react";
import { RegistryModule } from "@/lib/content/registry.generated";
import { useProgress } from "@/lib/store/progress";
import { cn } from "@/lib/utils";

export function ModuleView({
  moduleMeta,
  onOpenConcept,
}: {
  moduleMeta: RegistryModule;
  onOpenConcept: (conceptId: string) => void;
}) {
  const solved = useProgress((s) => s.solved);
  const conceptVisits = useProgress((s) => s.conceptVisits);

  const rows = useMemo(
    () =>
      moduleMeta.concepts.map((c) => {
        const visited = !!conceptVisits[`${moduleMeta.id}/${c.id}`];
        return { ...c, visited };
      }),
    [moduleMeta, conceptVisits]
  );

  // solved exercise ids belonging to this module (via id prefix)
  const solvedInModule = useMemo(() => {
    const prefixes: Record<string, string[]> = {
      "python-basics": ["py-"],
      numpy: ["np-"],
      pandas: ["pd-"],
      stdlib: ["std-"],
      sklearn: ["sk-"],
      matplotlib: ["mpl-"],
      seaborn: ["sns-"],
      tensorflow: ["tf-"],
    };
    const prefixesForModule = prefixes[moduleMeta.id] ?? [];
    return Object.keys(solved).filter((id) =>
      prefixesForModule.some((p) => id.startsWith(p))
    ).length;
  }, [solved, moduleMeta.id]);

  const pct =
    moduleMeta.exerciseCount > 0
      ? Math.round((solvedInModule / moduleMeta.exerciseCount) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="#/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          <ArrowLeft size={13} /> All modules
        </Link>
      </div>

      <div className="mb-6 mt-2">
        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none" aria-hidden>
            {moduleMeta.icon}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-[27px]">
              {moduleMeta.name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {moduleMeta.tagline}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-3 min-w-[220px]">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-lab-dim">
              {solvedInModule}/{moduleMeta.exerciseCount} solved
            </span>
          </div>
          <div className="flex gap-2 font-mono text-[10.5px] text-lab-dim">
            <span className="rounded border border-border px-2 py-1">
              {moduleMeta.conceptCount} concepts
            </span>
            <span className="rounded border border-border px-2 py-1">
              {moduleMeta.exerciseCount} exercises
            </span>
            <span className="rounded border border-border px-2 py-1">
              {moduleMeta.codeLines} lines of examples
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpenConcept(c.id)}
            className={cn(
              "focus-ring group flex w-full items-center gap-3 rounded-xl border border-border bg-card/50 p-3.5 text-left transition-all hover:border-primary/40 hover:bg-card"
            )}
          >
            <span className="font-mono text-xs text-lab-dim">
              {String(c.num).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-semibold text-foreground/95">
                {c.title}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                {c.exerciseCount > 0 ? (
                  <>
                    <span>{c.exerciseCount} exercises</span>
                    {c.exerciseCount >= 6 && (
                      <span className="rounded bg-violet-500/15 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-violet-300">
                        deep dive
                      </span>
                    )}
                  </>
                ) : (
                  <span className="italic">reference chapter</span>
                )}
                {c.visited && (
                  <span className="rounded bg-primary/10 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-primary/80">
                    visited
                  </span>
                )}
              </div>
            </div>
            {c.exerciseCount > 0 ? (
              <Circle size={14} className="shrink-0 text-lab-dim/60" aria-hidden />
            ) : (
              <CheckCircle2 size={14} className="shrink-0 text-lab-dim/40" aria-hidden />
            )}
            <ChevronRight
              size={16}
              className="shrink-0 text-lab-dim transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
