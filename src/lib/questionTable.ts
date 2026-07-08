import type { Question, Curriculum, Difficulty } from "@/types/question";
import {
  getAllQuestions,
  getQuestionsByFilters,
  isMcqQuestion,
} from "@/lib/questions";
import { isQuestionSolved } from "@/lib/progress";

export type QuestionTypeFilter = "all" | "mcq" | "long";
export type StatusFilter = "all" | "solved" | "unsolved";

export interface TableFilters {
  curriculum?: Curriculum | "";
  topic?: string;
  difficulties?: Difficulty[];
  type?: QuestionTypeFilter;
  status?: StatusFilter;
  keyword?: string;
}

export interface QuestionTableRow {
  question: Question;
  solved: boolean;
  type: "MCQ" | "Long";
}

export function filterQuestionsForTable(
  filters: TableFilters,
  allQuestions: Question[] = getAllQuestions()
): QuestionTableRow[] {
  let pool = getQuestionsByFilters({
    curriculum: filters.curriculum || undefined,
    keyword: filters.keyword || undefined,
  });

  if (filters.difficulties && filters.difficulties.length > 0) {
    const allowed = new Set(filters.difficulties);
    pool = pool.filter((q) => allowed.has(q.difficulty));
  }

  if (filters.topic) {
    pool = pool.filter((q) => getSimpleTopic(q.topic) === filters.topic);
  }

  if (filters.type === "mcq") {
    pool = pool.filter(isMcqQuestion);
  } else if (filters.type === "long") {
    pool = pool.filter((q) => !isMcqQuestion(q));
  }

  if (filters.status === "solved") {
    pool = pool.filter((q) => isQuestionSolved(q.id));
  } else if (filters.status === "unsolved") {
    pool = pool.filter((q) => !isQuestionSolved(q.id));
  }

  return pool.map((question) => ({
    question,
    solved: isQuestionSolved(question.id),
    type: isMcqQuestion(question) ? "MCQ" : "Long",
  }));
}

/**
 * Truncate text without cutting inside a $...$ math segment, so the
 * result can still be rendered with LatexText.
 */
export function truncateLatex(text: string, maxLen = 90): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;

  // Split into text / $...$ segments; \$ inside math is not a delimiter
  const segments = clean.split(/(\$(?:\\.|[^$\\])*\$)/g).filter(Boolean);
  let out = "";
  for (const seg of segments) {
    if (out.length + seg.length > maxLen) break;
    out += seg;
  }
  if (!out) out = segments[0] ?? clean.slice(0, maxLen);
  return `${out.trimEnd()} …`;
}

export function stripLatexPreview(text: string, maxLen = 80): string {
  const plain = text
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen - 1)}…`;
}

export function getUniqueTopics(questions: Question[] = getAllQuestions()): string[] {
  return [...new Set(questions.map((q) => q.topic))].sort();
}

/** Curriculum-specific topic name -> simple display topic. */
const TOPIC_TO_SIMPLE: Record<string, string> = {
  "Algebra and Functions": "Algebra",
  "Algebra and Linear Relationships": "Algebra",
  Algebra: "Algebra",
  "Functions and Graphs": "Functions",
  Trigonometry: "Trigonometry",
  "Calculus (Differentiation and Integration)": "Calculus",
  "Applications of Calculus": "Calculus",
  Calculus: "Calculus",
  "Limits and Continuity": "Calculus",
  Derivatives: "Calculus",
  "Applications of Derivatives": "Calculus",
  Integrals: "Calculus",
  "Applications of Integrals": "Calculus",
  "Differential Equations": "Calculus",
  "Series and Parametric/Polar Functions": "Calculus",
  "Probability and Statistics": "Probability & Statistics",
  "Data and Statistics": "Probability & Statistics",
  Probability: "Probability & Statistics",
  "Statistics and Probability": "Probability & Statistics",
  "Statistics and Data Analysis": "Probability & Statistics",
  "Random Variables and Distributions": "Probability & Statistics",
  "Exploring Data": "Probability & Statistics",
  "Sampling and Experimental Design": "Probability & Statistics",
  "Sampling Distributions": "Probability & Statistics",
  "Statistical Inference": "Probability & Statistics",
  "Regression and Correlation": "Probability & Statistics",
  Regression: "Probability & Statistics",
  Vectors: "Vectors",
  "Sequences and Series": "Sequences & Series",
  "Financial Mathematics": "Financial Maths",
  "Measurement and Geometry": "Geometry",
  "Networks and Time Series": "Networks",
  "Mathematical Reasoning": "Proof",
  Proof: "Proof",
  "Mathematical Modelling": "Modelling",
};

const SIMPLE_TOPIC_ORDER = [
  "Algebra",
  "Functions",
  "Calculus",
  "Trigonometry",
  "Probability & Statistics",
  "Vectors",
  "Sequences & Series",
  "Financial Maths",
  "Geometry",
  "Networks",
  "Modelling",
  "Proof",
];

export function getSimpleTopic(topic: string): string {
  return TOPIC_TO_SIMPLE[topic] ?? topic;
}

/** Unique simple topics present in the question bank, in a fixed sensible order. */
export function getSimpleTopics(questions: Question[] = getAllQuestions()): string[] {
  const present = new Set(questions.map((q) => getSimpleTopic(q.topic)));
  const ordered = SIMPLE_TOPIC_ORDER.filter((t) => present.has(t));
  const extras = [...present].filter((t) => !SIMPLE_TOPIC_ORDER.includes(t)).sort();
  return [...ordered, ...extras];
}
