"use client";

import { useEffect, useState } from "react";
import { kernel, KernelManager } from "@/lib/kernel/manager";
import { KernelStatus } from "@/lib/kernel/protocol";
import { RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<KernelStatus, { label: string; color: string; pulse?: boolean }> = {
  offline: { label: "Kernel offline", color: "bg-zinc-500" },
  booting: { label: "Booting kernel…", color: "bg-amber-400", pulse: true },
  ready: { label: "Kernel ready", color: "bg-emerald-400" },
  "loading-pkg": { label: "Loading packages…", color: "bg-amber-400", pulse: true },
  busy: { label: "Executing…", color: "bg-amber-400", pulse: true },
  restarting: { label: "Restarting kernel…", color: "bg-orange-400", pulse: true },
  error: { label: "Kernel error", color: "bg-red-400" },
};

export function KernelStatusBadge({
  compact = false,
  target = kernel,
}: {
  compact?: boolean;
  /** which kernel to reflect (Python/Pyodide by default, TFJS on DL pages) */
  target?: KernelManager;
}) {
  const [state, setState] = useState(() => ({
    status: target.status,
    detail: target.detail,
    runtimeInfo: target.runtimeInfo,
  }));

  useEffect(() => {
    const unsub = target.subscribe(() =>
      setState({
        status: target.status,
        detail: target.detail,
        runtimeInfo: target.runtimeInfo,
      })
    );
    return unsub;
  }, [target]);

  const meta = STATUS_META[state.status];

  return (
    <div className="flex items-center gap-2">
      <div
        className="group relative flex items-center gap-2 rounded-full border border-border bg-card/70 py-1 pl-2.5 pr-3"
        title={state.runtimeInfo || state.detail || meta.label}
      >
        <span className={cn("h-2 w-2 rounded-full", meta.color, meta.pulse && "pulse-dot")} />
        <span className="max-w-[150px] truncate font-mono text-[10.5px] text-muted-foreground">
          {compact ? (state.runtimeInfo.split(" · ")[0] || meta.label) : meta.label}
        </span>
        {state.status === "loading-pkg" && !compact && (
          <span className="shimmer h-2 w-8 rounded-full" />
        )}
      </div>
      {!compact && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => target.reset()}
            className="focus-ring rounded-md border border-border bg-card/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Clear kernel memory (variables defined in cells)"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => target.restart()}
            className="focus-ring rounded-md border border-border bg-card/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            title="Restart kernel"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
