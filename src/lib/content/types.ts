// Content model for PyLab — concepts, examples and authored exercises.

export type Difficulty = "easy" | "medium" | "hard" | "expert";

/** Exercise language: "py" runs on the Pyodide kernel, "js" on the TFJS kernel. */
export type ExerciseLang = "py" | "js";

export type TestKind =
  | "exact"
  | "float"
  | "array"
  | "frame"
  | "series"
  | "set"
  | "raises"
  | "stdout";

export interface TestCase {
  name: string;
  kind: TestKind;
  hidden: boolean;
  weight?: number;
  setup?: string;
  expr?: string;
  expected?: string;
  stdin?: string;
  explain?: string;
}

export interface WorkedExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Exercise {
  id: string;
  lang?: ExerciseLang;
  title: string;
  difficulty: Difficulty;
  xp: number;
  story: string;
  task: string;
  constraints?: string[];
  examples: WorkedExample[];
  signature: string;
  starterCode: string;
  bootstrap: string;
  hints: string[];
  conceptsTested: string[];
  tests: TestCase[];
}

export type BlockType =
  | "code"
  | "note"
  | "params"
  | "sig"
  | "methods"
  | "playground"
  | "visual";

/** One layer of a network-architecture diagram (see <ArchDiagram/>). */
export interface ArchLayerSpec {
  type: string; // dense | conv2d | maxpool | flatten | dropout | batchnorm | embedding | rnn | lstm | gru | bidirectional | attention | mha | output
  units?: number;
  activation?: string;
  filters?: number;
  kernelSize?: number;
  strides?: number;
  rate?: number;
  inputDim?: number;
  outputDim?: number;
  heads?: number;
  poolSize?: number;
  returnSequences?: boolean;
  label?: string;
}

export interface ArchSpec {
  input: number;
  inputLabel?: string;
  layers: ArchLayerSpec[];
}

export interface AttentionSpec {
  tokens: string[];
  weights: number[][];
  caption?: string;
}

export interface ContentBlock {
  type: BlockType;
  title?: string;
  code?: string;
  output?: string[];
  kind?: string; // note: note|warning · visual: arch-diagram|attention|nn-playground
  text?: string;
  rows?: string[][];
  spec?: ArchSpec | AttentionSpec | Record<string, unknown>; // visual payload
}

export interface Concept {
  id: string;
  num: number;
  title: string;
  intro: string;
  explanation: string;
  keyPoints: string[];
  blocks: ContentBlock[];
  exercises: Exercise[];
}

export interface ModuleData {
  moduleId: string;
  concepts: Concept[];
}
