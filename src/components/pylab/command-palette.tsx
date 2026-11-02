"use client";

// Command palette (Cmd/Ctrl+K): jump to modules, concepts, exercises, views.

import { useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  SEARCH_INDEX,
  MODULE_REGISTRY,
} from "@/lib/content/registry.generated";
import { navigate } from "@/lib/store/router";
import { DifficultyChip } from "./notebook-view";
import { useProgress } from "@/lib/store/progress";

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const solved = useProgress((s) => s.solved);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { concepts: [], exercises: [] };
    const concepts = SEARCH_INDEX.filter(
      (e) => e.type === "concept" && (e.title.toLowerCase().includes(q) || e.keywords?.includes(q))
    ).slice(0, 6);
    const exercises = SEARCH_INDEX.filter(
      (e) =>
        e.type === "exercise" &&
        (e.title.toLowerCase().includes(q) || e.keywords?.includes(q) || e.id.includes(q))
    ).slice(0, 8);
    return { concepts, exercises };
  }, [query]);

  const run = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <CommandInput
        placeholder="Search concepts, exercises, modules…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No matches found.</CommandEmpty>

        {query.trim() === "" && (
          <>
            <CommandGroup heading="Jump to">
              <CommandItem onSelect={() => run("/")}>🏠 Home</CommandItem>
              <CommandItem onSelect={() => run("/progress")}>📈 Your progress</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Modules">
              {MODULE_REGISTRY.map((m) => (
                <CommandItem key={m.id} onSelect={() => run(`/m/${m.id}`)}>
                  <span className="mr-2">{m.icon}</span>
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-lab-dim">
                    {m.conceptCount} concepts · {m.exerciseCount} exercises
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {query.trim() !== "" && results.concepts.length > 0 && (
          <CommandGroup heading="Concepts">
            {results.concepts.map((c) => (
              <CommandItem
                key={c.id}
                value={`concept ${c.title} ${c.id}`}
                onSelect={() => run(`/m/${c.module}/${c.id}`)}
              >
                <span className="mr-2">📖</span>
                <span className="font-medium">{c.title}</span>
                <span className="ml-auto text-[10px] text-lab-dim">
                  {MODULE_REGISTRY.find((m) => m.id === c.module)?.short}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.trim() !== "" && results.exercises.length > 0 && (
          <CommandGroup heading="Exercises">
            {results.exercises.map((e) => (
              <CommandItem
                key={e.id}
                value={`exercise ${e.title} ${e.id}`}
                onSelect={() => run(`/x/${e.id}`)}
              >
                <span className="mr-2">{solved[e.id] ? "✅" : "⌨️"}</span>
                <span className="font-medium">{e.title}</span>
                <span className="ml-2 truncate text-[11px] text-muted-foreground">
                  {e.conceptTitle}
                </span>
                <span className="ml-auto">
                  {e.difficulty && <DifficultyChip d={e.difficulty as any} />}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
