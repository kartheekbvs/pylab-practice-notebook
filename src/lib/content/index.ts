"use client";

// Lazy content loader — module data files are big (up to ~350 KB), so they are
// dynamically imported on demand and cached in memory.

import { Concept, Exercise, ModuleData } from "./types";
import {
  MODULE_REGISTRY,
  RegistryModule,
} from "./registry.generated";

export type { RegistryModule };

const cache = new Map<string, ModuleData>();
const inflight = new Map<string, Promise<ModuleData>>();

export function getRegistry(): RegistryModule[] {
  return MODULE_REGISTRY;
}

export function getModuleMeta(moduleId: string): RegistryModule | undefined {
  return MODULE_REGISTRY.find((m) => m.id === moduleId);
}

export async function loadModule(moduleId: string): Promise<ModuleData> {
  const cached = cache.get(moduleId);
  if (cached) return cached;
  const pending = inflight.get(moduleId);
  if (pending) return pending;
  const promise = import(`./data/${moduleId}.json`)
    .then((m) => {
      const data = m.default as ModuleData;
      cache.set(moduleId, data);
      inflight.delete(moduleId);
      return data;
    })
    .catch((e) => {
      inflight.delete(moduleId);
      throw e;
    });
  inflight.set(moduleId, promise);
  return promise;
}

export function getCachedModule(moduleId: string): ModuleData | undefined {
  return cache.get(moduleId);
}

export async function loadConcept(
  moduleId: string,
  conceptId: string
): Promise<Concept | undefined> {
  const data = await loadModule(moduleId);
  return data.concepts.find((c) => c.id === conceptId);
}

export interface ExerciseRef {
  exercise: Exercise;
  concept: Concept;
  module: RegistryModule;
}

export async function loadExerciseById(
  exerciseId: string
): Promise<ExerciseRef | undefined> {
  // exercise id prefixes encode the module: py-/np-/pd-/std-/sk-/mpl-/sns-
  const mod = moduleForExerciseId(exerciseId);
  if (!mod) return undefined;
  const data = await loadModule(mod.id);
  for (const concept of data.concepts) {
    const ex = concept.exercises.find((e) => e.id === exerciseId);
    if (ex) return { exercise: ex, concept, module: mod };
  }
  return undefined;
}

export function moduleForExerciseId(
  exerciseId: string
): RegistryModule | undefined {
  const map: Record<string, string> = {
    "py-": "python-basics",
    "np-": "numpy",
    "pd-": "pandas",
    std: "stdlib",
    "sk-": "sklearn",
    mpl: "matplotlib",
    sns: "seaborn",
  };
  for (const [prefix, moduleId] of Object.entries(map)) {
    if (exerciseId.startsWith(prefix)) {
      return MODULE_REGISTRY.find((m) => m.id === moduleId);
    }
  }
  return undefined;
}

/** Total exercises per difficulty across everything (from registry). */
export function difficultyCounts(moduleId?: string) {
  // cheap approximation used only for the home page — accurate counts come from
  // module data; registry counts total exercises per module.
  if (moduleId) {
    const m = getModuleMeta(moduleId);
    return m ? m.exerciseCount : 0;
  }
  return MODULE_REGISTRY.reduce((acc, m) => acc + m.exerciseCount, 0);
}
