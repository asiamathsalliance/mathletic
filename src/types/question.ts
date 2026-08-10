export type Curriculum = "HSC" | "IB" | "AP" | "A-Level";

/** Competition/curriculum id as stored in the database. */
export type Competition = "AMC10" | "AMC12" | "HSC" | "IB" | "AP" | "A_LEVEL";

/** Display label for a question's source — legacy curricula plus AMC. */
export type CurriculumLabel = Curriculum | "AMC 10" | "AMC 12";

export type Difficulty = "Easy" | "Medium" | "Hard";

export const COMPETITION_TO_LABEL: Record<Competition, CurriculumLabel> = {
  AMC10: "AMC 10",
  AMC12: "AMC 12",
  HSC: "HSC",
  IB: "IB",
  AP: "AP",
  A_LEVEL: "A-Level",
};

export const LABEL_TO_COMPETITION: Record<CurriculumLabel, Competition> = {
  "AMC 10": "AMC10",
  "AMC 12": "AMC12",
  HSC: "HSC",
  IB: "IB",
  AP: "AP",
  "A-Level": "A_LEVEL",
};

/** Stream id within a curriculum: advanced | standard (HSC), hl | sl (IB), calculus | statistics (AP), pure | statistics (A-Level) */
export type StreamId =
  | "advanced"
  | "standard"
  | "hl"
  | "sl"
  | "calculus"
  | "statistics"
  | "pure";

export interface Question {
  id: string;
  curriculum: CurriculumLabel;
  /** DB competition id ("AMC10", "HSC", …). Derived from `curriculum` for legacy JSON data. */
  competition?: Competition;
  /** AMC-only: competition year (e.g. 2023). */
  amcYear?: number;
  /** AMC-only: "A" or "B" variant. */
  amcVariant?: "A" | "B";
  /** AMC-only: problem number 1–25. */
  problemNumber?: number;
  /** AMC-only: derived bucket "1-10" | "11-20" | "21-25". */
  difficultyBucket?: string;
  /** Stream this question belongs to (so Advanced vs Standard, HL vs SL, etc. show different questions) */
  stream?: StreamId;
  topic: string;
  subtopic: string;
  year: number;
  examSource: string;
  difficulty: Difficulty;
  questionText: string;
  /**
   * Optional question image path, e.g. "/questions/q1.png".
   * In questions.json use: "image": "/questions/..." or "image": "none".
   */
  image?: string;
  /** Optional image URL or path (e.g. /questions/q1.png) for the question */
  questionImage?: string;
  /** Multiple choice: 4 options (legacy) or 5 (AMC, A–E). Use with correctIndex. */
  choices?: string[];
  /** Index of the correct choice (0-based). */
  correctIndex?: number;
  solution: string;
  /** Optional image URL or path for the solution */
  solutionImage?: string;
  tags: string[];
  /** False when format validation failed; never served to clients. */
  verified?: boolean;
  /** Server grading hint — never include answer_value on client payloads. */
  answerType?: "numeric" | "symbolic" | "expression";
}

export const CURRICULA: Curriculum[] = ["HSC", "IB", "AP", "A-Level"];

export const TOPICS_BY_CURRICULUM: Record<Curriculum, string[]> = {
  HSC: ["Algebra", "Functions", "Calculus", "Trigonometry", "Probability", "Vectors"],
  IB: ["Algebra", "Functions", "Calculus", "Trigonometry", "Probability", "Vectors"],
  AP: ["Algebra", "Functions", "Calculus", "Trigonometry", "Probability", "Vectors"],
  "A-Level": ["Algebra", "Functions", "Calculus", "Trigonometry", "Probability", "Vectors"],
};

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

/** Years for filter: 2025 down to 2010 (newest first) */
export const FILTER_YEARS: number[] = Array.from(
  { length: 2025 - 2010 + 1 },
  (_, i) => 2025 - i
);

/** Filters returned by the AI search API */
export interface AISearchFilters {
  curriculum?: Curriculum;
  topic?: string;
  difficulty?: Difficulty;
}
