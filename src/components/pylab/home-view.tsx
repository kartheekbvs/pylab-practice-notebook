"use client";

// Home: hero, stats, continue-learning, module cards.

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Flame,
  Zap,
  BookOpen,
  Dumbbell,
  Terminal,
  Layers,
} from "lucide-react";
import {
  MODULE_REGISTRY,
  TOTAL_CONCEPTS,
  TOTAL_EXERCISES,
  TOTAL_CODE_LINES,
} from "@/lib/content/registry.generated";
import { useProgress, levelForXp } from "@/lib/store/progress";
import { navigate } from "@/lib/store/router";
import { loadModule } from "@/lib/content";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function HomeView() {
  const xp = useProgress((s) => s.xp);
  const solved = useProgress((s) => s.solved);
  const streak = useProgress((s) => s.streak);
  const lastConcept = useProgress((s) => s.lastConcept);
  const level = levelForXp(xp);
  const solvedCount = Object.keys(solved).length;

  const [continueTitle, setContinueTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!lastConcept) return;
    loadModule(lastConcept.moduleId)
      .then((m) => {
        const c = m.concepts.find((x) => x.id === lastConcept.conceptId);
        if (c) setContinueTitle(c.title);
      })
      .catch(() => {});
  }, [lastConcept]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 px-6 py-10 sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl"
        />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-primary">
            <Terminal size={12} /> Real Python · in your browser
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-[42px]">
            Py<span className="text-primary">Lab</span> Practice Notebook
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            The complete Python &amp; Data Science curriculum —{" "}
            <span className="text-foreground/90">basics to deep learning</span> — as an
            interactive notebook: run every reference example in a live kernel, then
            prove your understanding with HackerRank-style exercises — real test
            cases, hidden edge cases, instant grading.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {lastConcept && continueTitle ? (
              <button
                onClick={() =>
                  navigate(`/m/${lastConcept.moduleId}/${lastConcept.conceptId}`)
                }
                className="focus-ring group inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                Continue: {continueTitle}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/m/python-basics/variables-and-data-types")}
                className="focus-ring group inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                Start learning
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
            <Link
              href="#/progress"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card/60 px-4 text-sm font-semibold text-foreground/90 transition-colors hover:bg-card"
            >
              Your progress
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Layers size={14} />} value={String(MODULE_REGISTRY.length)} label="modules" />
            <Stat icon={<BookOpen size={14} />} value={String(TOTAL_CONCEPTS)} label="concepts" />
            <Stat icon={<Dumbbell size={14} />} value={String(TOTAL_EXERCISES)} label="exercises w/ test cases" />
            <Stat icon={<Terminal size={14} />} value={`${(TOTAL_CODE_LINES / 1000).toFixed(1)}k`} label="lines of runnable examples" />
          </div>
        </div>
      </div>

      {/* Progress strip */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Level {level.level}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-300/90">
              <Zap size={12} /> {xp} XP
            </span>
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">{level.name}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${level.progress * 100}%` }} />
          </div>
          <div className="mt-1.5 font-mono text-[10px] text-lab-dim">
            {level.next ? `${level.toNext} XP to ${level.next.name}` : "max level reached"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Streak
            </span>
            <Flame size={14} className="text-orange-400" />
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">
            {streak.current} day{streak.current === 1 ? "" : "s"} in a row
          </div>
          <div className="mt-2 font-mono text-[10.5px] text-lab-dim">
            longest: {streak.longest} · practice daily to keep it burning
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Solved
            </span>
            <Dumbbell size={14} className="text-primary" />
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">
            {solvedCount} / {TOTAL_EXERCISES} exercises
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(solvedCount / TOTAL_EXERCISES) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Modules */}
      <h2 className="mb-3 mt-10 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-foreground/70">
        <Layers size={15} className="text-primary" /> Browse the curriculum
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODULE_REGISTRY.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/m/${m.id}`)}
            className="focus-ring group relative overflow-hidden rounded-xl border border-border bg-card/50 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
          >
            <div className="flex items-start gap-3.5">
              <span className="text-3xl leading-none" aria-hidden>
                {m.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{m.name}</span>
                  {!m.runnable && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-300">
                      reference
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {m.tagline}
                </p>
                <div className="mt-3 flex items-center gap-2 font-mono text-[10.5px] text-lab-dim">
                  <span className="rounded border border-border px-1.5 py-0.5">
                    {m.conceptCount} concepts
                  </span>
                  <span className="rounded border border-border px-1.5 py-0.5">
                    {m.exerciseCount} exercises
                  </span>
                </div>
              </div>
              <ChevronRight
                size={18}
                className="mt-1 shrink-0 text-lab-dim transition-all group-hover:translate-x-1 group-hover:text-primary"
              />
            </div>
          </button>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <HowCard
          step="01"
          title="Learn by running"
          body="Every reference example is a live notebook cell. Edit it, run it with Shift+Enter, see real output and plots — powered by a real CPython kernel (Pyodide) with NumPy, Pandas, Matplotlib, Seaborn and scikit-learn."
        />
        <HowCard
          step="02"
          title="Prove it with test cases"
          body="Each concept ships reasoning-first exercises — HackerRank-style. Run the visible sample tests while you code, then Submit to face the hidden edge cases: empties, NaN, ties, off-by-one slices."
        />
        <HowCard
          step="03"
          title="Track mastery"
          body="Solved tests award XP, build your daily streak and fill per-concept mastery. The exercise harness that grades you in the browser is the exact one that validated every exercise offline."
        />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 font-mono text-lg font-bold text-foreground">
        <span className="text-primary">{icon}</span>
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-lab-dim">{label}</div>
    </div>
  );
}

function HowCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="font-mono text-[10px] font-bold tracking-widest text-primary">{step}</div>
      <div className="mt-1 text-sm font-bold text-foreground">{title}</div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
