export type Curriculum = "HSC" | "IB" | "AP" | "A-Level";

export type Difficulty = "Easy" | "Medium" | "Hard";

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
  curriculum: Curriculum;
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
  /** Multiple choice: 4 options. Use with correctIndex. */
  choices?: string[];
  /** Index of the correct choice (0–3). */
  correctIndex?: number;
  solution: string;
  /** Optional image URL or path for the solution */
  solutionImage?: string;
  tags: string[];
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
