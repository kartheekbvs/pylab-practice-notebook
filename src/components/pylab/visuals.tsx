"use client";

// Visual teaching blocks for the deep-learning module:
//   <ArchDiagram/>        — network architecture as an SVG column diagram
//   <AttentionHeatmap/>   — attention weight grid between tokens
// Used by concept "visual" blocks and by ```arch fences inside exercise tasks.

import { ArchLayerSpec, ArchSpec, AttentionSpec } from "@/lib/content/types";
import { cn } from "@/lib/utils";

// ── ArchDiagram ─────────────────────────────────────────────────────────────

interface LayerVisual {
  name: string;
  color: string; // tailwind-ish hex used for strokes/fills
  detail: (l: ArchLayerSpec) => string;
  dots?: (l: ArchLayerSpec) => number; // how many unit dots to draw inside
}

const LAYER_VISUALS: Record<string, LayerVisual> = {
  dense: {
    name: "Dense",
    color: "#34d399",
    detail: (l) => `${l.units ?? "?"} units`,
    dots: (l) => l.units ?? 4,
  },
  conv2d: {
    name: "Conv2D",
    color: "#38bdf8",
    detail: (l) => `${l.filters ?? "?"} filters · ${l.kernelSize ?? 3}×${l.kernelSize ?? 3}${l.strides ? ` · s${l.strides}` : ""}${l.padding ? ` · ${l.padding}` : ""}`,
  },
  maxpool: {
    name: "MaxPool",
    color: "#7dd3fc",
    detail: (l) => `pool ${l.poolSize ?? 2}×${l.poolSize ?? 2}`,
  },
  flatten: { name: "Flatten", color: "#94a3b8", detail: () => "→ 1-D vector" },
  dropout: {
    name: "Dropout",
    color: "#a1a1aa",
    detail: (l) => `rate ${l.rate ?? 0.5}`,
  },
  batchnorm: { name: "BatchNorm", color: "#a1a1aa", detail: () => "normalize + scale" },
  embedding: {
    name: "Embedding",
    color: "#c084fc",
    detail: (l) => `${l.inputDim ?? "?"} → ${l.outputDim ?? "?"} dims`,
  },
  rnn: {
    name: "SimpleRNN",
    color: "#fbbf24",
    detail: (l) => `${l.units ?? "?"} units${l.returnSequences ? " · seq out" : ""}`,
    dots: (l) => l.units ?? 4,
  },
  lstm: {
    name: "LSTM",
    color: "#fbbf24",
    detail: (l) => `${l.units ?? "?"} units${l.returnSequences ? " · seq out" : ""}`,
    dots: (l) => l.units ?? 4,
  },
  gru: {
    name: "GRU",
    color: "#f59e0b",
    detail: (l) => `${l.units ?? "?"} units`,
    dots: (l) => l.units ?? 4,
  },
  bidirectional: {
    name: "Bidirectional",
    color: "#f59e0b",
    detail: (l) => `wrapped layer, both directions`,
  },
  attention: {
    name: "Self-Attention",
    color: "#fb7185",
    detail: (l) => (l.heads ? `${l.heads} head${l.heads > 1 ? "s" : ""}` : "softmax(QKᵀ/√d)·V"),
  },
  mha: {
    name: "Multi-Head Attn",
    color: "#fb7185",
    detail: (l) => (l.heads ? `${l.heads} heads` : "parallel heads"),
  },
  output: {
    name: "Output",
    color: "#6ee7b7",
    detail: (l) => (l.units ? `${l.units} unit${l.units > 1 ? "s" : ""}` : ""),
    dots: (l) => l.units ?? 1,
  },
};

const MAX_DOTS = 5;

export function ArchDiagram({ spec, caption }: { spec: ArchSpec; caption?: string }) {
  const layers = spec.layers ?? [];
  const inputDots = Math.min(spec.input ?? 4, MAX_DOTS);
  const inputMore = (spec.input ?? 4) > MAX_DOTS;

  const CARD_W = 118;
  const GAP = 46;
  const CARD_H = 168;
  const PAD_X = 22;
  const PAD_Y = 34;
  const width = PAD_X * 2 + 60 + GAP + layers.length * (CARD_W + GAP);
  const height = CARD_H + PAD_Y * 2 + 26;

  const colX = (i: number) => PAD_X + 60 + GAP + i * (CARD_W + GAP);
  const inputX = PAD_X + 30;

  return (
    <figure className="my-3 overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: Math.min(width, 720), width: "100%", height: "auto" }}
          role="img"
          aria-label="Network architecture diagram"
        >
          {/* input dots */}
          {Array.from({ length: inputDots }).map((_, i) => {
            const y = centerY(height) - ((inputDots - 1) * 18) / 2 + i * 18;
            return <circle key={i} cx={inputX} cy={y} r={5.5} fill="#5eead4" opacity={0.9} />;
          })}
          {inputMore && (
            <text x={inputX} y={centerY(height) + ((inputDots - 1) * 18) / 2 + 20} textAnchor="middle" fontSize={10} fill="#7f9488" fontFamily="var(--font-mono-override, monospace)">
              +{(spec.input ?? 0) - MAX_DOTS} more
            </text>
          )}
          <text x={inputX} y={height - 8} textAnchor="middle" fontSize={11} fill="#a7bdb2" fontFamily="var(--font-mono-override, monospace)">
            {spec.inputLabel ?? `${spec.input} in`}
          </text>

          {layers.map((l, i) => {
            const v = LAYER_VISUALS[l.type] ?? {
              name: l.type,
              color: "#94a3b8",
              detail: () => "",
            };
            const x = colX(i);
            const dots = v.dots?.(l);
            const nDots = dots ? Math.min(dots, MAX_DOTS) : 0;
            const isOutput = l.type === "output";
            return (
              <g key={i}>
                {/* connection from previous column */}
                {i === 0 ? (
                  [0, 1, 2].map((k) => (
                    <path
                      key={k}
                      d={`M ${inputX + 8} ${centerY(height) - 20 + k * 20} C ${inputX + GAP - 6} ${centerY(height) - 20 + k * 20}, ${x - GAP + 8} ${centerY(height)}, ${x - 4} ${centerY(height)}`}
                      stroke={v.color}
                      strokeWidth={1.1}
                      fill="none"
                      opacity={0.35}
                    />
                  ))
                ) : (
                  [0, 1, 2].map((k) => (
                    <path
                      key={k}
                      d={`M ${colX(i - 1) + CARD_W} ${centerY(height) - 20 + k * 20} C ${colX(i - 1) + CARD_W + GAP / 2} ${centerY(height) - 20 + k * 20}, ${x - GAP / 2} ${centerY(height)}, ${x} ${centerY(height)}`}
                      stroke={v.color}
                      strokeWidth={1.1}
                      fill="none"
                      opacity={0.35}
                    />
                  ))
                )}
                {/* card */}
                <rect
                  x={x}
                  y={PAD_Y + 14}
                  width={CARD_W}
                  height={CARD_H - 28}
                  rx={12}
                  fill={`${v.color}14`}
                  stroke={v.color}
                  strokeWidth={1.4}
                  strokeDasharray={l.type === "dropout" ? "5 3" : undefined}
                />
                {/* unit dots */}
                {nDots > 0 &&
                  Array.from({ length: nDots }).map((_, k) => {
                    const cy = centerY(height) - ((nDots - 1) * 17) / 2 + k * 17;
                    return (
                      <circle key={k} cx={x + CARD_W / 2} cy={cy} r={5} fill={v.color} opacity={0.85} />
                    );
                  })}
                {dots && dots > MAX_DOTS && (
                  <text x={x + CARD_W / 2} y={PAD_Y + CARD_H - 22} textAnchor="middle" fontSize={9} fill="#7f9488" fontFamily="var(--font-mono-override, monospace)">
                    +{dots - MAX_DOTS}
                  </text>
                )}
                {/* labels */}
                <text x={x + CARD_W / 2} y={PAD_Y + 32} textAnchor="middle" fontSize={12} fontWeight={700} fill={v.color} fontFamily="var(--font-mono-override, monospace)">
                  {l.label ? "" : v.name}
                </text>
                <text x={x + CARD_W / 2} y={PAD_Y + 46} textAnchor="middle" fontSize={9.5} fill="#c3d4cb" fontFamily="var(--font-mono-override, monospace)">
                  {v.detail(l).length > 22 ? v.detail(l).slice(0, 21) + "…" : v.detail(l)}
                </text>
                {l.activation && (
                  <text x={x + CARD_W / 2} y={PAD_Y + CARD_H - 8} textAnchor="middle" fontSize={9.5} fill="#eab308" fontFamily="var(--font-mono-override, monospace)">
                    {l.activation}
                  </text>
                )}
                {isOutput && (
                  <text x={x + CARD_W / 2} y={centerY(height) + 46} textAnchor="middle" fontSize={9.5} fill="#8fa79b" fontFamily="var(--font-mono-override, monospace)">
                    predictions
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {(caption ?? (layers.length ? undefined : "")) && (
        <figcaption className="border-t border-border/60 px-4 py-2 text-[12px] leading-relaxed text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function centerY(height: number) {
  return height / 2 - 4;
}

// ── AttentionHeatmap ────────────────────────────────────────────────────────

function weightColor(w: number) {
  // 0 → near-transparent slate, 0.5 → emerald, 1 → amber/orange
  if (w < 0.5) {
    const t = Math.max(0, w / 0.5);
    return `rgba(52, 211, 153, ${0.06 + t * 0.55})`;
  }
  const t = (w - 0.5) / 0.5;
  // blend emerald → amber
  const r = Math.round(52 + t * (251 - 52));
  const g = Math.round(211 + t * (191 - 211));
  const b = Math.round(153 + t * (36 - 153));
  return `rgba(${r}, ${g}, ${b}, ${0.61 + t * 0.35})`;
}

export function AttentionHeatmap({ spec, caption }: { spec: AttentionSpec; caption?: string }) {
  const tokens = spec.tokens ?? [];
  const weights = spec.weights ?? [];
  return (
    <figure className="my-3 overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="overflow-x-auto px-4 pb-3 pt-4">
        <table className="border-separate border-spacing-1 font-mono text-[10.5px]">
          <thead>
            <tr>
              <th className="w-16" />
              {tokens.map((t, j) => (
                <th key={j} className="px-1 pb-1 font-medium text-muted-foreground">
                  <span className="inline-block max-w-[64px] truncate" title={t}>
                    {t}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weights.map((row, i) => (
              <tr key={i}>
                <th className="max-w-[64px] truncate pr-2 text-right font-medium text-muted-foreground" title={tokens[i]}>
                  {tokens[i]}
                </th>
                {row.map((w, j) => (
                  <td key={j} className="p-0">
                    <div
                      className="flex h-9 w-12 items-center justify-center rounded border border-border/50 text-[9.5px] font-semibold text-foreground/85"
                      style={{ background: weightColor(w) }}
                      title={`${tokens[i]} → ${tokens[j]}: ${w}`}
                    >
                      {w.toFixed(2).replace(/^0/, "")}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="border-t border-border/60 px-4 py-2 text-[12px] leading-relaxed text-muted-foreground">
        {caption ?? spec.caption ?? "Rows = query token · columns = key token · darker color = more attention weight."}
      </figcaption>
    </figure>
  );
}

/** Render a "visual" content block (dispatch by kind). */
export function VisualBlock({
  kind,
  spec,
  text,
  title,
}: {
  kind?: string;
  spec?: unknown;
  text?: string;
  title?: string;
}) {
  if (kind === "arch-diagram" && spec && typeof spec === "object") {
    return <ArchDiagram spec={spec as ArchSpec} caption={text} />;
  }
  if (kind === "attention" && spec && typeof spec === "object") {
    return <AttentionHeatmap spec={spec as AttentionSpec} caption={text} />;
  }
  // unknown visual kind — render the caption text if present
  if (text) {
    return (
      <div className={cn("my-3 rounded-xl border border-border bg-card/50 px-4 py-3 text-[12.5px] text-muted-foreground")}>
        {title ? <div className="mb-1 font-semibold text-foreground/85">{title}</div> : null}
        {text}
      </div>
    );
  }
  return null;
}
