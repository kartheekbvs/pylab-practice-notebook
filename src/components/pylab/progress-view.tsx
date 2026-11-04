"use client";

// Progress dashboard: XP/level, streak calendar, module mastery, difficulty mix,
// recent solves, danger-zone reset.

import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Flame,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  MODULE_REGISTRY,
  TOTAL_EXERCISES,
} from "@/lib/content/registry.generated";
import { levelForXp, useProgress } from "@/lib/store/progress";
import { loadExerciseById } from "@/lib/content";
import { Difficulty } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DIFFS: Difficulty[] = ["easy", "medium", "hard", "expert"];

export function ProgressView() {
  const { xp, solved, streak, activeDays, resetAll } = useProgress();
  const level = levelForXp(xp);
  const solvedIds = Object.keys(solved);
  const [recent, setRecent] = useState<
    { id: string; title: string; difficulty: Difficulty; at: number; xp: number }[]
  >([]);
  const [breakdown, setBreakdown] = useState<Record<Difficulty, number> | null>(null);

  useEffect(() => {
    if (solvedIds.length === 0) return;
    const entries = Object.entries(solved).sort((a, b) => b[1].at - a[1].at);
    Promise.all(
      entries.map(async ([id, rec]) => {
        try {
          const ref = await loadExerciseById(id);
          return ref
            ? { id, title: ref.exercise.title, difficulty: ref.exercise.difficulty, at: rec.at, xp: rec.xp }
            : null;
        } catch {
          return null;
        }
      })
    ).then((rows) => {
      const valid = rows.filter(Boolean) as {
        id: string; title: string; difficulty: Difficulty; at: number; xp: number;
      }[];
      const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
      valid.forEach((r) => counts[r.difficulty]++);
      setBreakdown(counts);
      setRecent(valid.slice(0, 8));
    });
  }, [solved, solvedIds.length]);

  // streak calendar: last 70 days
  const days = useMemo(() => {
    const out: { date: string; active: boolean }[] = [];
    const set = new Set(activeDays);
    for (let i = 69; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const s = d.toISOString().slice(0, 10);
      out.push({ date: s, active: set.has(s) });
    }
    return out;
  }, [activeDays]);

  const moduleMastery = useMemo(() => {
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
    return MODULE_REGISTRY.map((m) => {
      const ps = prefixes[m.id] ?? [];
      const solvedCount = solvedIds.filter((id) => ps.some((p) => id.startsWith(p))).length;
      return {
        id: m.id,
        name: m.name,
        icon: m.icon,
        total: m.exerciseCount,
        solvedCount,
        pct: m.exerciseCount > 0 ? solvedCount / m.exerciseCount : 0,
      };
    });
  }, [solvedIds]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Your progress</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stored locally in this browser — no account needed.
      </p>

      {/* Top cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Trophy size={13} className="text-primary" /> Level {level.level}
          </div>
          <div className="mt-2 text-lg font-bold">{level.name}</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${level.progress * 100}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-lab-dim">
            <span className="inline-flex items-center gap-1 text-amber-300/90">
              <Zap size={11} /> {xp} XP
            </span>
            {level.next ? <span>{level.toNext} to next</span> : <span>MAX</span>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Flame size={13} className="text-orange-400" /> Streak
          </div>
          <div className="mt-2 text-lg font-bold">
            {streak.current} day{streak.current === 1 ? "" : "s"}
          </div>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {days.slice(-70).map((d, i) => (
              <div
                key={i}
                title={d.date}
                className={cn(
                  "aspect-square rounded-[2px]",
                  d.active ? "bg-primary/80" : "bg-secondary/60"
                )}
              />
            ))}
          </div>
          <div className="mt-2 font-mono text-[10.5px] text-lab-dim">
            longest {streak.longest} days
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <CheckCircle2 size={13} className="text-primary" /> Solved
          </div>
          <div className="mt-2 text-lg font-bold">
            {solvedIds.length} / {TOTAL_EXERCISES}
          </div>
          <div className="mt-3 space-y-1.5">
            {DIFFS.map((d) => (
              <div key={d} className="flex items-center gap-2">
                <span className="w-12 font-mono text-[10px] uppercase text-lab-dim">{d}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      d === "easy" && "bg-emerald-400",
                      d === "medium" && "bg-amber-400",
                      d === "hard" && "bg-orange-400",
                      d === "expert" && "bg-violet-400"
                    )}
                    style={{
                      width: `${
                        breakdown && solvedIds.length
                          ? (breakdown[d] / solvedIds.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-[10px] text-lab-dim">
                  {breakdown ? breakdown[d] : "·"}
                </span>
              </div>
            ))}
            {breakdown === null && solvedIds.length > 0 && (
              <div className="flex items-center gap-1 font-mono text-[10px] text-lab-dim">
                <Loader2 size={10} className="animate-spin" /> loading breakdown…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module mastery */}
      <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-widest text-foreground/70">
        Module mastery
      </h2>
      <div className="space-y-2">
        {moduleMastery.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-4 py-3">
            <span className="text-xl" aria-hidden>{m.icon}</span>
            <div className="w-36 shrink-0 text-[13px] font-semibold text-foreground/90">{m.name}</div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${m.pct * 100}%` }} />
            </div>
            <span className="w-16 text-right font-mono text-[10.5px] text-lab-dim">
              {m.solvedCount}/{m.total}
            </span>
          </div>
        ))}
      </div>

      {/* Recent solves */}
      <h2 className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-widest text-foreground/70">
        Recent solves
      </h2>
      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing solved yet — open any concept and try the first exercise.
        </div>
      ) : (
        <div className="space-y-1.5">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-4 py-2.5">
              <CheckCircle2 size={14} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/90">{r.title}</span>
              <span
                className={cn(
                  "rounded border px-1.5 py-px font-mono text-[9.5px] uppercase",
                  r.difficulty === "easy" && "border-emerald-500/30 text-emerald-300",
                  r.difficulty === "medium" && "border-amber-500/30 text-amber-300",
                  r.difficulty === "hard" && "border-orange-500/30 text-orange-300",
                  r.difficulty === "expert" && "border-violet-500/30 text-violet-300"
                )}
              >
                {r.difficulty}
              </span>
              <span className="font-mono text-[10px] text-amber-300/80">+{r.xp} XP</span>
              <span className="hidden font-mono text-[10px] text-lab-dim sm:inline">
                {new Date(r.at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Danger zone */}
      <div className="mt-10 rounded-xl border border-red-500/25 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-200">
          <AlertTriangle size={14} /> Danger zone
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Reset all XP, solved exercises, streaks, drafts and notebook edits in this browser.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="mt-3">
              Reset all progress
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset everything?</AlertDialogTitle>
              <AlertDialogDescription>
                This wipes your XP, solved exercises, streak, notebook edits and
                exercise drafts stored in this browser. There is no undo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my progress</AlertDialogCancel>
              <AlertDialogAction onClick={resetAll}>Yes, reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
