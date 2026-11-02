"use client";

// Persistent learner progress: XP, solved exercises, streaks, cell edits,
// exercise drafts. Stored in localStorage via zustand/persist.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SolveRecord {
  at: number;
  xp: number;
  hintsUsed: number;
  attempts: number;
}

export interface ProgressState {
  xp: number;
  solved: Record<string, SolveRecord>;
  attempts: Record<string, number>;
  hintsRevealed: Record<string, number>;
  cellEdits: Record<string, string>;
  cellRuns: Record<string, number>;
  drafts: Record<string, string>;
  conceptVisits: Record<string, number>;
  lastConcept: { moduleId: string; conceptId: string } | null;
  activeDays: string[];
  streak: { current: number; longest: number; lastDay: string | null };

  addXp: (amount: number) => void;
  markSolved: (exerciseId: string, xp: number, hintsUsed: number) => boolean;
  recordAttempt: (exerciseId: string) => void;
  revealHint: (exerciseId: string) => number;
  setCellEdit: (key: string, code: string) => void;
  clearCellEdit: (key: string) => void;
  recordCellRun: (key: string) => void;
  setDraft: (exerciseId: string, code: string) => void;
  visitConcept: (moduleId: string, conceptId: string) => void;
  touchDay: () => void;
  resetAll: () => void;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const LEVELS = [
  { level: 1, name: "Terminal Novice", xp: 0 },
  { level: 2, name: "Script Runner", xp: 100 },
  { level: 3, name: "Data Apprentice", xp: 300 },
  { level: 4, name: "Loop Wrangler", xp: 700 },
  { level: 5, name: "Function Smith", xp: 1200 },
  { level: 6, name: "Array Bender", xp: 2000 },
  { level: 7, name: "Frame Shaper", xp: 3200 },
  { level: 8, name: "Model Trainer", xp: 5000 },
  { level: 9, name: "Kernel Sage", xp: 8000 },
  { level: 10, name: "PyLab Legend", xp: 12000 },
];

export function levelForXp(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  const next = LEVELS.find((l) => l.xp > xp);
  const span = next ? next.xp - current.xp : 1;
  const into = next ? xp - current.xp : 1;
  return {
    ...current,
    next,
    progress: next ? Math.min(1, into / span) : 1,
    toNext: next ? next.xp - xp : 0,
  };
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      solved: {},
      attempts: {},
      hintsRevealed: {},
      cellEdits: {},
      cellRuns: {},
      drafts: {},
      conceptVisits: {},
      lastConcept: null,
      activeDays: [],
      streak: { current: 0, longest: 0, lastDay: null },

      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),

      markSolved: (exerciseId, xp, hintsUsed) => {
        const prev = get().solved[exerciseId];
        if (prev) return false; // already solved, no double XP
        set((s) => ({
          xp: s.xp + xp,
          solved: {
            ...s.solved,
            [exerciseId]: {
              at: Date.now(),
              xp,
              hintsUsed,
              attempts: (s.attempts[exerciseId] ?? 0) + 1,
            },
          },
        }));
        get().touchDay();
        return true;
      },

      recordAttempt: (exerciseId) =>
        set((s) => ({
          attempts: { ...s.attempts, [exerciseId]: (s.attempts[exerciseId] ?? 0) + 1 },
        })),

      revealHint: (exerciseId) => {
        const n = (get().hintsRevealed[exerciseId] ?? 0) + 1;
        set((s) => ({ hintsRevealed: { ...s.hintsRevealed, [exerciseId]: n } }));
        return n;
      },

      setCellEdit: (key, code) =>
        set((s) => ({ cellEdits: { ...s.cellEdits, [key]: code } })),

      clearCellEdit: (key) =>
        set((s) => {
          const next = { ...s.cellEdits };
          delete next[key];
          return { cellEdits: next };
        }),

      recordCellRun: (key) =>
        set((s) => ({ cellRuns: { ...s.cellRuns, [key]: (s.cellRuns[key] ?? 0) + 1 } })),

      setDraft: (exerciseId, code) =>
        set((s) => ({ drafts: { ...s.drafts, [exerciseId]: code } })),

      visitConcept: (moduleId, conceptId) =>
        set((s) => ({
          conceptVisits: {
            ...s.conceptVisits,
            [`${moduleId}/${conceptId}`]: Date.now(),
          },
          lastConcept: { moduleId, conceptId: conceptId },
        })),

      touchDay: () => {
        const today = todayStr();
        const s = get();
        if (s.streak.lastDay === today) return;
        const continued = s.streak.lastDay === yesterdayStr();
        const current = continued ? s.streak.current + 1 : 1;
        set({
          activeDays: s.activeDays.includes(today)
            ? s.activeDays
            : [...s.activeDays, today].slice(-120),
          streak: {
            current,
            longest: Math.max(current, s.streak.longest),
            lastDay: today,
          },
        });
      },

      resetAll: () =>
        set({
          xp: 0,
          solved: {},
          attempts: {},
          hintsRevealed: {},
          cellEdits: {},
          cellRuns: {},
          drafts: {},
          conceptVisits: {},
          lastConcept: null,
          activeDays: [],
          streak: { current: 0, longest: 0, lastDay: null },
        }),
    }),
    {
      name: "pylab-progress-v1",
      version: 1,
    }
  )
);
