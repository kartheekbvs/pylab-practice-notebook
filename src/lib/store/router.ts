"use client";

// Minimal hash router — the whole app lives at "/" (single Next.js route),
// so deep-linkable views are encoded in the URL hash.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type Route =
  | { name: "home" }
  | { name: "module"; moduleId: string }
  | { name: "concept"; moduleId: string; conceptId: string }
  | { name: "exercise"; exerciseId: string }
  | { name: "progress" };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "progress") return { name: "progress" };
  if (parts[0] === "m" && parts[1]) {
    if (parts[2]) return { name: "concept", moduleId: parts[1], conceptId: parts[2] };
    return { name: "module", moduleId: parts[1] };
  }
  if (parts[0] === "x" && parts[1]) return { name: "exercise", exerciseId: parts[1] };
  return { name: "home" };
}

let currentRoute: Route = parseHash(
  typeof window !== "undefined" ? window.location.hash : ""
);
const listeners = new Set<() => void>();

function handleChange() {
  currentRoute = parseHash(window.location.hash);
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", handleChange);
}

export function navigate(path: string) {
  const target = path.startsWith("#") ? path : `#${path}`;
  if (window.location.hash === target) {
    // same hash: force reparse (e.g. re-open same exercise)
    handleChange();
    return;
  }
  window.location.hash = target;
}

export function routeToString(r: Route): string {
  switch (r.name) {
    case "home":
      return "#/";
    case "progress":
      return "#/progress";
    case "module":
      return `#/m/${r.moduleId}`;
    case "concept":
      return `#/m/${r.moduleId}/${r.conceptId}`;
    case "exercise":
      return `#/x/${r.exerciseId}`;
  }
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => currentRoute,
    () => currentRoute
  );
}

/** Fire a callback on every route change (e.g. scroll to top). */
export function useRouteEffect(fn: (r: Route) => void) {
  const route = useRoute();
  const lastKeyRef = useRef<string | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    const key = JSON.stringify(route);
    if (lastKeyRef.current === null) {
      lastKeyRef.current = key; // skip the very first render
      return;
    }
    if (lastKeyRef.current !== key) {
      lastKeyRef.current = key;
      fnRef.current(route);
    }
  }, [route]);
}
