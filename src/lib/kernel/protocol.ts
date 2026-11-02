// Kernel protocol between the PyLab UI and the Pyodide web worker.

export interface RunResultPayload {
  ok: boolean;
  stdout: string;
  resultRepr?: string;
  hasResult: boolean;
  error?: string;
  errorLine?: number | null;
  images: string[]; // base64 PNG data URLs
  timeMs: number;
}

export interface TestResultItem {
  name: string;
  hidden: boolean;
  kind: string;
  passed: boolean;
  message: string;
  expected: string;
  actual: string;
  explain: string;
  status: string;
}

export interface TestRunPayload {
  status:
    | "passed"
    | "failed"
    | "error"
    | "syntax-error"
    | "runtime-error"
    | "harness-error";
  results: TestResultItem[];
  stdout: string;
  passed: number;
  total: number;
  userError?: string;
  timeMs: number;
}

export type KernelStatus =
  | "offline"
  | "booting"
  | "ready"
  | "loading-pkg"
  | "busy"
  | "restarting"
  | "error";

// main -> worker
export type WorkerRequest =
  | { id: string; type: "init" }
  | { id: string; type: "loadPackages"; packages: string[] }
  | { id: string; type: "run"; code: string; seq: number }
  | { id: string; type: "reset" }
  | {
      id: string;
      type: "test";
      userCode: string;
      exercise: unknown; // exercise spec (tests, bootstrap)
    };

// worker -> main
export type WorkerResponse =
  | { id: string; type: "status"; status: KernelStatus; detail?: string }
  | {
      id: string;
      type: "pkg-progress";
      package: string;
      done: boolean;
      error?: string;
    }
  | { id: string; type: "run-result"; payload: RunResultPayload }
  | { id: string; type: "test-result"; payload: TestRunPayload }
  | { id: string; type: "error"; message: string };
