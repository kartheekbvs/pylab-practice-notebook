"use client";

// PyLab kernel manager — owns the compute web workers.
// Two kernels exist:
//   • kernel     — Pyodide (CPython/WASM) for the Python modules
//   • tfjsKernel — TensorFlow.js (CPU backend) for the deep-learning module
// Both speak the same request/response protocol, so one class drives both.
// Handles boot, package preloading, request/response correlation, timeouts and
// transparent kernel restarts (worker termination + re-boot + package replay).

import {
  KernelStatus,
  RunResultPayload,
  TestRunPayload,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";

const RUN_TIMEOUT_MS = 20_000;

type Pending = {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
};

export type KernelKind = "py" | "tfjs";

export interface KernelConfig {
  workerUrl: string;
  bootDetail: string;
  label: string; // ready-detail prefix that identifies this kernel's runtime info
  restartDetail: string;
}

class KernelManager {
  private worker: Worker | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;
  private loadedPackages = new Set<string>();
  private loadPromise: Promise<void> | null = null;
  private restartLock = false;

  status: KernelStatus = "offline";
  detail = "";
  runtimeInfo = "";
  readonly kind: KernelKind;
  private listeners = new Set<() => void>();

  constructor(cfg: KernelConfig & { kind: KernelKind }) {
    this.kind = cfg.kind;
    this.cfg = cfg;
  }
  private cfg: KernelConfig;

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private setStatus(s: KernelStatus, detail = "") {
    this.status = s;
    this.detail = detail;
    this.emit();
  }

  boot() {
    if (this.worker) return;
    this.spawnWorker();
  }

  private spawnWorker() {
    this.setStatus("booting", this.cfg.bootDetail);
    const worker = new Worker(this.cfg.workerUrl);
    this.worker = worker;
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.onMessage(ev.data);
    worker.onerror = (ev) => {
      this.setStatus("error", ev.message || "Kernel crashed");
    };
    this.post({ id: "kernel", type: "init" });
  }

  private onMessage(msg: WorkerResponse) {
    if (msg.type === "status") {
      this.setStatus(msg.status, msg.detail || this.detail);
      if (msg.status === "ready" && msg.detail?.startsWith(this.cfg.label)) {
        this.runtimeInfo = msg.detail;
      }
      return;
    }
    if (msg.type === "pkg-progress") {
      this.setStatus(
        "loading-pkg",
        msg.done ? `Loaded ${msg.package}` : `Loading ${msg.package}…`
      );
      if (msg.error) {
        console.warn(`[kernel] package ${msg.package} failed:`, msg.error);
      }
      return;
    }
    const pending = this.pending.get(msg.id);
    if (msg.type === "error" && !pending) {
      // kernel-level error (e.g. boot failure) — surface it in the status
      this.setStatus("error", msg.message);
      return;
    }
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(msg.id);
    if (msg.type === "run-result") {
      this.setStatus("ready");
      pending.resolve(msg.payload as RunResultPayload);
    } else if (msg.type === "test-result") {
      this.setStatus("ready");
      pending.resolve(msg.payload as TestRunPayload);
    } else if (msg.type === "error") {
      this.setStatus("error", msg.message);
      pending.reject(new Error(msg.message));
    }
  }

  private post(msg: WorkerRequest) {
    this.worker?.postMessage(msg);
  }

  private request<T>(msg: Omit<WorkerRequest, "id">, timeoutMs = RUN_TIMEOUT_MS): Promise<T> {
    if (!this.worker) this.spawnWorker();
    this.setStatus("busy", this.detail);
    const id = `req-${++this.seq}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.restartAfterTimeout().finally(() =>
          reject(
            new Error(
              "Execution timed out after 20s (infinite loop?). The kernel was restarted — re-run your cells."
            )
          )
        );
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.post({ ...(msg as WorkerRequest), id });
    });
  }

  private async restartAfterTimeout() {
    if (this.restartLock) return;
    this.restartLock = true;
    this.setStatus("restarting", this.cfg.restartDetail);
    try {
      this.worker?.terminate();
    } catch {
      /* noop */
    }
    this.worker = null;
    this.loadedPackages.clear();
    // reject any other pending requests
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Kernel restarted"));
      this.pending.delete(id);
    }
    this.spawnWorker();
    this.restartLock = false;
  }

  restart(): Promise<void> {
    return this.restartAfterTimeout();
  }

  /** Preload the packages a module needs (deduped, one at a time). */
  ensurePackages(packages: string[]): Promise<void> {
    const missing = packages.filter((p) => !this.loadedPackages.has(p));
    if (missing.length === 0) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.doLoad(missing).finally(() => {
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  private async doLoad(missing: string[]): Promise<void> {
    await this.ready();
    this.post({ id: "kernel", type: "loadPackages", packages: missing });
    missing.forEach((p) => this.loadedPackages.add(p));
    // "ready" status arrives via message; wait for it
    await this.waitForStatus("ready", 120_000);
  }

  private waitForStatus(target: KernelStatus, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const check = () => {
        if (this.status === target) return resolve();
        if (this.status === "error") return resolve();
        if (Date.now() - t0 > timeoutMs) return resolve();
        setTimeout(check, 150);
      };
      check();
    });
  }

  /** Wait until the kernel is ready to execute (boots if needed). */
  async ready(): Promise<void> {
    if (!this.worker) this.spawnWorker();
    const t0 = Date.now();
    while (this.status !== "ready" && Date.now() - t0 < 120_000) {
      if (this.status === "error") throw new Error(this.detail || "Kernel failed to start");
      await new Promise((r) => setTimeout(r, 150));
    }
    if (this.status !== "ready" && this.status !== "busy" && this.status !== "loading-pkg") {
      throw new Error("Kernel did not become ready in time");
    }
  }

  /** Run a notebook cell (stateful kernel namespace). */
  async runCell(code: string): Promise<RunResultPayload> {
    return this.request<RunResultPayload>({ type: "run", code, seq: this.seq });
  }

  /** Grade user code against an exercise spec. */
  async runTests(userCode: string, exercise: unknown): Promise<TestRunPayload> {
    return this.request<TestRunPayload>({
      type: "test",
      userCode,
      exercise,
    });
  }

  async reset() {
    await this.ready();
    this.post({ id: "kernel", type: "reset" });
    await this.waitForStatus("ready", 15_000);
  }
}

// singletons
export const kernel = new KernelManager({
  kind: "py",
  workerUrl: "/pyodide-worker.js",
  bootDetail: "Downloading Python runtime (first load ~10s)…",
  restartDetail: "Restarting kernel after timeout…",
  label: "Python",
});

export const tfjsKernel = new KernelManager({
  kind: "tfjs",
  workerUrl: "/tfjs-worker.js",
  bootDetail: "Loading TensorFlow.js…",
  restartDetail: "Restarting TensorFlow.js kernel…",
  label: "TensorFlow",
});

/** Pick the kernel that executes a module (default: the Python/Pyodide kernel). */
export function kernelForModule(
  moduleMeta?: { kernel?: KernelKind | string } | null
): KernelManager {
  return moduleMeta?.kernel === "tfjs" ? tfjsKernel : kernel;
}
