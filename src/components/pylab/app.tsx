"use client";

// App shell: sidebar (module tree), topbar (kernel status, search, XP, streak),
// view switching via the hash router, command palette, global shortcuts.

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Zap,
  Flame,
  Menu,
  X,
  Home,
  BarChart3,
  ChevronDown,
  Terminal,
} from "lucide-react";
import { MODULE_REGISTRY } from "@/lib/content/registry.generated";
import { loadConcept, loadExerciseById, ExerciseRef } from "@/lib/content";
import { Concept } from "@/lib/content/types";
import { navigate, useRoute, useRouteEffect } from "@/lib/store/router";
import { useProgress, levelForXp } from "@/lib/store/progress";
import { kernel } from "@/lib/kernel/manager";
import { KernelStatusBadge } from "./kernel-badge";
import { HomeView } from "./home-view";
import { ModuleView } from "./module-view";
import { NotebookView } from "./notebook-view";
import { ExerciseView } from "./exercise-view";
import { ProgressView } from "./progress-view";
import { CommandPalette } from "./command-palette";
import { cn } from "@/lib/utils";

export function PyLabApp() {
  const route = useRoute();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [concept, setConcept] = useState<Concept | null>(null);
  const [exerciseRef, setExerciseRef] = useState<ExerciseRef | null>(null);
  const [loading, setLoading] = useState(false);

  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak.current);
  const level = levelForXp(xp);

  // global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // route -> data loading
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setConcept(null);
      setExerciseRef(null);
      setLoading(true);
      try {
        if (route.name === "concept") {
          const c = await loadConcept(route.moduleId, route.conceptId);
          if (!cancelled) setConcept(c ?? null);
        } else if (route.name === "exercise") {
          const ref = await loadExerciseById(route.exerciseId);
          if (!cancelled) setExerciseRef(ref ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [route]);

  useRouteEffect(() => {
    window.scrollTo({ top: 0 });
    setSidebarOpen(false);
  });

  const openConcept = useCallback(
    (conceptId: string) => {
      if (route.name === "module" || route.name === "concept") {
        navigate(`/m/${route.moduleId}/${conceptId}`);
      }
    },
    [route]
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Curriculum navigation"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Terminal size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-black leading-tight tracking-tight">
              Py<span className="text-primary">Lab</span>
            </div>
            <div className="font-mono text-[9.5px] uppercase tracking-widest text-lab-dim">
              practice notebook
            </div>
          </div>
          <button
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          <div className="mb-2 space-y-0.5">
            <SideLink active={route.name === "home"} onClick={() => navigate("/")} icon={<Home size={14} />} label="Home" />
            <SideLink active={route.name === "progress"} onClick={() => navigate("/progress")} icon={<BarChart3 size={14} />} label="Progress" />
          </div>
          <div className="mb-1.5 px-2 pt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-lab-dim">
            Curriculum
          </div>
          <div className="space-y-0.5">
            {MODULE_REGISTRY.map((m) => (
              <ModuleTree
                key={m.id}
                moduleId={m.id}
                icon={m.icon}
                name={m.name}
                exerciseCount={m.exerciseCount}
                concepts={m.concepts}
                activeModule={
                  route.name === "module" || route.name === "concept"
                    ? route.moduleId
                    : null
                }
                activeConcept={route.name === "concept" ? route.conceptId : null}
                onNavigate={(cid) =>
                  cid ? navigate(`/m/${m.id}/${cid}`) : navigate(`/m/${m.id}`)
                }
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground/85">
              Lv {level.level} · {level.name}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-amber-300/90">
              <Zap size={11} /> {xp}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${level.progress * 100}%` }} />
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-border bg-background/85 px-3 backdrop-blur sm:px-5">
          <button
            className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={17} />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="focus-ring flex h-9 w-full min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-left text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Search size={14} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">Search concepts &amp; exercises…</span>
            <kbd className="hidden rounded border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[9.5px] text-lab-dim sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {streak > 0 && (
              <span
                className="hidden items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-300 sm:inline-flex"
                title="Daily streak"
              >
                <Flame size={12} /> {streak}
              </span>
            )}
            <span className="hidden items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-300 sm:inline-flex" title="Experience points">
              <Zap size={12} /> {xp} XP
            </span>
            <div className="hidden md:block">
              <KernelStatusBadge />
            </div>
            <div className="md:hidden">
              <KernelStatusBadge compact />
            </div>
          </div>
        </header>

        {/* Views */}
        <main className="min-h-0 flex-1">
          {loading ? (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="flex items-center gap-3 font-mono text-xs text-lab-dim">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                loading notebook…
              </div>
            </div>
          ) : route.name === "home" ? (
            <HomeView />
          ) : route.name === "progress" ? (
            <ProgressView />
          ) : route.name === "module" ? (
            (() => {
              const meta = MODULE_REGISTRY.find((m) => m.id === route.moduleId);
              if (!meta) return <NotFound what="Module" />;
              return <ModuleView moduleMeta={meta} onOpenConcept={openConcept} />;
            })()
          ) : route.name === "concept" ? (
            (() => {
              const meta = MODULE_REGISTRY.find((m) => m.id === route.moduleId);
              if (!meta) return <NotFound what="Module" />;
              if (!concept) return <NotFound what="Concept" />;
              return <NotebookView concept={concept} moduleMeta={meta} />;
            })()
          ) : route.name === "exercise" ? (
            exerciseRef ? (
              <ExerciseView key={exerciseRef.exercise.id} exerciseRef={exerciseRef} />
            ) : (
              <NotFound what="Exercise" />
            )
          ) : null}
        </main>

        <footer className="mt-auto border-t border-border bg-card/30 px-4 py-3.5 text-center text-[11px] text-lab-dim sm:px-6">
          PyLab Practice Notebook · built on the{" "}
          <a
            href="https://github.com/kartheekbvs/gow"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            kartheekbvs/gow
          </a>{" "}
          PyDocs curriculum · Python runs locally in your browser via{" "}
          <a
            href="https://pyodide.org"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            Pyodide
          </a>{" "}
          · progress stored in this browser
        </footer>
      </div>

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
    </div>
  );
}

function SideLink({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-foreground/75 hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ModuleTree({
  moduleId,
  icon,
  name,
  exerciseCount,
  concepts,
  activeModule,
  activeConcept,
  onNavigate,
}: {
  moduleId: string;
  icon: string;
  name: string;
  exerciseCount: number;
  concepts: { id: string; num: number; title: string; exerciseCount: number }[];
  activeModule: string | null;
  activeConcept: string | null;
  onNavigate: (conceptId?: string) => void;
}) {
  const expanded = activeModule === moduleId;
  const [manuallyOpen, setManuallyOpen] = useState<boolean | null>(null);
  const open = manuallyOpen ?? expanded;

  return (
    <div>
      <div
        className={cn(
          "flex items-center rounded-lg transition-colors",
          expanded && activeConcept === null && "bg-primary/12",
          !expanded && "hover:bg-accent"
        )}
      >
        <button
          onClick={() => {
            onNavigate();
            setManuallyOpen(null);
          }}
          className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-foreground/80 hover:text-foreground"
        >
          <span aria-hidden>{icon}</span>
          <span className="truncate">{name}</span>
          <span className="ml-auto font-mono text-[9.5px] text-lab-dim">{exerciseCount}</span>
        </button>
        <button
          onClick={() => setManuallyOpen(!open)}
          className="focus-ring rounded-md p-1.5 text-lab-dim hover:text-foreground"
          aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
          aria-expanded={open}
        >
          <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <div className="ml-4 mt-0.5 space-y-px border-l border-border pl-2">
          {concepts.map((c) => (
            <button
              key={c.id}
              onClick={() => onNavigate(c.id)}
              className={cn(
                "focus-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                activeConcept === c.id
                  ? "bg-primary/12 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span className="font-mono text-[9px] text-lab-dim">
                {String(c.num).padStart(2, "0")}
              </span>
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotFound({ what }: { what: string }) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="font-mono text-4xl">404</div>
      <div className="text-sm text-muted-foreground">
        {what} not found — it may have been renamed.
      </div>
      <button
        onClick={() => navigate("/")}
        className="focus-ring rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
      >
        Back to home
      </button>
    </div>
  );
}
