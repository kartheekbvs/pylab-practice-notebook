"use client";

// Interactive neural-network playground (TensorFlow Playground style) for the
// deep-learning module. Trains a real tf.js model in the main thread on the
// bundled 2-D datasets and paints the live decision boundary + loss curve.
// This is the "visual → intuition" companion to the chapter's code exercises.

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Plus, RotateCcw, StepForward, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const TFJS_SRC = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const DATASETS = [
  { id: "spiral", label: "Spiral" },
  { id: "circles", label: "Circles" },
  { id: "xor", label: "XOR" },
  { id: "gauss", label: "Gauss" },
] as const;
const ACTIVATIONS = ["relu", "tanh", "sigmoid"] as const;
const RATES = [0.003, 0.01, 0.03, 0.1, 0.3];
const DOMAIN = 5.5;

type Pt = { x: number; y: number; label: number };

let tfLoadPromise: Promise<any> | null = null;
function loadTf(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).tf) {
    return Promise.resolve((window as any).tf);
  }
  if (tfLoadPromise) return tfLoadPromise;
  tfLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TFJS_SRC;
    s.onload = () => {
      const tf = (window as any).tf;
      if (!tf) return reject(new Error("tf.js failed to load"));
      tf.setBackend("cpu").then(() => resolve(tf));
    };
    s.onerror = () => reject(new Error("could not load TensorFlow.js from CDN"));
    document.head.appendChild(s);
  });
  return tfLoadPromise;
}

export function NNPlayground() {
  const [tfReady, setTfReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<(typeof DATASETS)[number]["id"]>("spiral");
  const [activation, setActivation] = useState<(typeof ACTIVATIONS)[number]>("tanh");
  const [lr, setLr] = useState(0.03);
  const [hidden, setHidden] = useState<number[]>([8, 8]);
  const [running, setRunning] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState<number | null>(null);
  const [acc, setAcc] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tfRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const dataRef = useRef<Pt[] | null>(null);
  const xsRef = useRef<any>(null);
  const ysRef = useRef<any>(null);
  const lossHistRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // boot tf.js
  useEffect(() => {
    let dead = false;
    loadTf()
      .then((tf) => {
        if (dead) return;
        tfRef.current = tf;
        setTfReady(true);
      })
      .catch((e) => !dead && setLoadError(String(e?.message ?? e)));
    return () => {
      dead = true;
    };
  }, []);

  const disposeModel = useCallback(() => {
    const tf = tfRef.current;
    try {
      if (modelRef.current) modelRef.current.dispose?.();
    } catch { /* noop */ }
    try {
      if (xsRef.current) xsRef.current.dispose?.();
      if (ysRef.current) ysRef.current.dispose?.();
    } catch { /* noop */ }
    if (tf) {
      try { tf.disposeVariables?.(); } catch { /* noop */ }
    }
    modelRef.current = null;
    xsRef.current = null;
    ysRef.current = null;
  }, []);

  // fetch dataset points
  useEffect(() => {
    let dead = false;
    fetch(`/tfdata/${dataset}.json`)
      .then((r) => r.json())
      .then((d) => {
        if (dead) return;
        dataRef.current = (d.x as number[][]).map((p, i) => ({
          x: p[0],
          y: p[1],
          label: d.y[i],
        }));
        drawBoundary();
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset]);

  // stop training on unmount / config change
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      disposeModel();
    };
  }, [disposeModel]);

  const buildModel = useCallback(() => {
    const tf = tfRef.current;
    if (!tf) return;
    disposeModel();
    const model = tf.sequential();
    hidden.forEach((units, i) => {
      model.add(
        tf.layers.dense({
          units,
          activation,
          inputShape: i === 0 ? [2] : undefined,
        })
      );
    });
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
    model.compile({ optimizer: tf.train.adam(lr), loss: "binaryCrossentropy", metrics: ["accuracy"] });
    modelRef.current = model;
    const data = dataRef.current ?? [];
    xsRef.current = tf.tensor2d(data.map((p) => [p.x, p.y]));
    ysRef.current = tf.tensor2d(data.map((p) => [p.label]));
    setEpoch(0);
    setLoss(null);
    setAcc(null);
    lossHistRef.current = [];
    drawBoundary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, activation, lr, disposeModel]);

  const trainStep = useCallback(async () => {
    const tf = tfRef.current;
    const model = modelRef.current;
    if (!tf || !model || !xsRef.current) return;
    const h = await model.fit(xsRef.current, ysRef.current, {
      epochs: 1,
      batchSize: 32,
      verbose: 0,
    });
    const l = h.history.loss[0];
    const a = h.history.acc?.[0] ?? null;
    lossHistRef.current.push(l);
    if (lossHistRef.current.length > 400) lossHistRef.current.shift();
    setEpoch((e) => e + 1);
    setLoss(l);
    setAcc(a);
    drawBoundary();
  }, []);

  const loop = useCallback(async () => {
    if (!runningRef.current) return;
    try {
      await trainStep();
    } catch {
      runningRef.current = false;
      setRunning(false);
      return;
    }
    rafRef.current = requestAnimationFrame(() => loop());
  }, [trainStep]);

  const toggleRun = useCallback(() => {
    if (!modelRef.current) buildModel();
    if (runningRef.current) {
      runningRef.current = false;
      setRunning(false);
    } else {
      runningRef.current = true;
      setRunning(true);
      loop();
    }
  }, [buildModel, loop]);

  const step = useCallback(async () => {
    runningRef.current = false;
    setRunning(false);
    if (!modelRef.current) buildModel();
    await trainStep();
  }, [buildModel, trainStep]);

  const reset = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    buildModel();
  }, [buildModel]);

  // ── painting ──────────────────────────────────────────────────────────────
  const drawBoundary = useCallback(() => {
    const cv = canvasRef.current;
    const data = dataRef.current;
    if (!cv || !data) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width,
      H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const tf = tfRef.current;
    const model = modelRef.current;
    const G = 46; // grid resolution
    const cw = W / G,
      ch = H / G;

    if (tf && model) {
      try {
        const pts: number[][] = [];
        for (let i = 0; i < G; i++)
          for (let j = 0; j < G; j++) {
            const x = -DOMAIN + ((2 * DOMAIN) * (i + 0.5)) / G;
            const y = -DOMAIN + ((2 * DOMAIN) * (j + 0.5)) / G;
            pts.push([x, y]);
          }
        const probs = tf.tidy(() =>
          Array.from(model.predict(tf.tensor2d(pts)).dataSync())
        );
        probs.forEach((p, k) => {
          const i = k % G,
            j = Math.floor(k / G);
          const strength = Math.min(1, Math.abs(p - 0.5) * 2.4);
          ctx.fillStyle =
            p >= 0.5
              ? `rgba(56, 189, 248, ${0.05 + strength * 0.3})`
              : `rgba(251, 146, 60, ${0.05 + strength * 0.3})`;
          ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
        });
      } catch { /* model not ready */ }
    }

    // points
    const px = (x: number) => ((x + DOMAIN) / (2 * DOMAIN)) * W;
    const py = (y: number) => H - ((y + DOMAIN) / (2 * DOMAIN)) * H;
    for (const p of data) {
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), 3, 0, Math.PI * 2);
      ctx.fillStyle = p.label === 1 ? "#38bdf8" : "#fb923c";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(6, 15, 12, 0.85)";
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    // initial paint once tf + data are both ready
    if (tfReady && dataRef.current) drawBoundary();
  }, [tfReady, dataset, drawBoundary]);

  // rebuild when hyperparams change
  useEffect(() => {
    if (!tfReady) return;
    runningRef.current = false;
    setRunning(false);
    buildModel();
  }, [tfReady, dataset, buildModel]);

  // loss sparkline
  const hist = lossHistRef.current;
  const maxL = Math.max(...hist, 1e-4);
  const path = hist
    .map((l, i) => {
      const x = hist.length > 1 ? (i / (hist.length - 1)) * 100 : 0;
      const y = 28 - (l / maxL) * 26;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border/70 bg-secondary/30 px-4 py-2.5">
        <span className="text-[13px] font-semibold text-foreground/90">🧪 Interactive playground</span>
        <span className="text-[11.5px] text-muted-foreground">
          — a real neural net trains in your browser (TensorFlow.js)
        </span>
      </div>

      {loadError ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-red-300">
          {loadError} — check your connection and reload.
        </div>
      ) : !tfReady ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-[12.5px] text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> loading TensorFlow.js…
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[auto_minmax(0,1fr)]">
          {/* controls */}
          <div className="space-y-3 border-b border-border/60 p-4 lg:w-[240px] lg:border-b-0 lg:border-r">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-lab-dim">Dataset</span>
              <select
                value={dataset}
                onChange={(e) => setDataset(e.target.value as any)}
                className="w-full rounded-md border border-border bg-secondary/50 px-2 py-1.5 text-[12px] text-foreground/90 focus-ring"
              >
                {DATASETS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-lab-dim">
                Hidden layers
              </span>
              <div className="space-y-1.5">
                {hidden.map((u, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <button
                      onClick={() => setHidden((h) => h.map((v, k) => (k === i ? Math.max(1, v - 1) : v)))}
                      className="focus-ring rounded border border-border px-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                      title="fewer units"
                    >
                      <Minus size={10} />
                    </button>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${(u / 8) * 100}%` }}
                      />
                    </div>
                    <span className="w-4 text-center font-mono text-[11px] text-foreground/80">{u}</span>
                    <button
                      onClick={() => setHidden((h) => h.map((v, k) => (k === i ? Math.min(8, v + 1) : v)))}
                      className="focus-ring rounded border border-border px-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                      title="more units"
                    >
                      <Plus size={10} />
                    </button>
                    <button
                      onClick={() => setHidden((h) => h.filter((_, k) => k !== i))}
                      disabled={hidden.length <= 1}
                      className="focus-ring rounded border border-border px-1 text-[10px] text-muted-foreground hover:text-red-300 disabled:opacity-30"
                      title="remove layer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setHidden((h) => (h.length < 4 ? [...h, 6] : h))}
                  disabled={hidden.length >= 4}
                  className="focus-ring w-full rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-30"
                >
                  + add layer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-lab-dim">Activation</span>
                <select
                  value={activation}
                  onChange={(e) => setActivation(e.target.value as any)}
                  className="w-full rounded-md border border-border bg-secondary/50 px-1.5 py-1.5 text-[12px] text-foreground/90 focus-ring"
                >
                  {ACTIVATIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-lab-dim">Learn rate</span>
                <select
                  value={lr}
                  onChange={(e) => setLr(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-secondary/50 px-1.5 py-1.5 font-mono text-[12px] text-foreground/90 focus-ring"
                >
                  {RATES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex gap-1.5 pt-1">
              <button
                onClick={toggleRun}
                className={cn(
                  "focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-semibold transition-colors",
                  running
                    ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                    : "bg-primary/15 text-primary hover:bg-primary/25"
                )}
              >
                {running ? <Pause size={12} /> : <Play size={12} />}
                {running ? "Pause" : "Train"}
              </button>
              <button
                onClick={step}
                className="focus-ring inline-flex items-center justify-center rounded-md border border-border px-2 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
                title="Train one epoch"
              >
                <StepForward size={12} />
              </button>
              <button
                onClick={reset}
                className="focus-ring inline-flex items-center justify-center rounded-md border border-border px-2 py-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
                title="New random network"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <div className="rounded-lg border border-border/60 bg-secondary/25 px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
              <div className="flex justify-between">
                <span>epoch</span>
                <span className="text-foreground/85">{epoch}</span>
              </div>
              <div className="flex justify-between">
                <span>loss</span>
                <span className="text-foreground/85">{loss === null ? "—" : loss.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span>train acc</span>
                <span className="text-emerald-300/90">{acc === null ? "—" : acc.toFixed(3)}</span>
              </div>
            </div>
          </div>

          {/* canvas + loss */}
          <div className="flex flex-col items-center gap-3 p-4">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="max-w-full rounded-lg border border-border/70 bg-[#0a1210]"
              aria-label="Decision boundary plot"
            />
            <div className="w-full max-w-[300px]">
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-lab-dim">
                <span>loss over epochs</span>
                <span className="text-foreground/70">{loss === null ? "" : loss.toFixed(3)}</span>
              </div>
              <svg viewBox="0 0 100 30" className="h-[34px] w-full rounded border border-border/60 bg-secondary/25" preserveAspectRatio="none">
                {hist.length > 1 && (
                  <path d={path} fill="none" stroke="#6ee7b7" strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
                )}
              </svg>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Watch the boundary bend: 1 hidden layer fits circles/XOR, the
                spiral usually wants 2+ layers or more units. Then rebuild the
                same network in code in the exercises below.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
