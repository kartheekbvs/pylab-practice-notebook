// Content model for PyLab — concepts, examples (from the gow/PyDocs repo,
// unchanged) and authored exercises.

export type Difficulty = "easy" | "medium" | "hard" | "expert";

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
  | "playground";

export interface ContentBlock {
  type: BlockType;
  title?: string;
  code?: string;
  output?: string[];
  kind?: string;
  text?: string;
  rows?: string[][];
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
