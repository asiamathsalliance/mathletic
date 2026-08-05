import type { Question, Competition, Difficulty } from "@/types/question";
import { filterQuestionList, isMcqQuestion } from "@/lib/questionUtils";

export type QuestionTypeFilter = "all" | "mcq" | "long";
export type StatusOption = "solved" | "unsolved";

export interface TableFilters {
  competitions?: Competition[];
  topic?: string;
  difficulties?: Difficulty[];
  type?: QuestionTypeFilter;
  statuses?: StatusOption[];
  keyword?: string;
}

export interface QuestionTableRow {
  question: {
    id: string;
    curriculum: Question["curriculum"];
    competition?: Competition;
    topic: string;
    difficulty: Difficulty;
    /** Preview or full stem — table only renders a truncated preview. */
    questionText: string;
  };
  solved: boolean;
  type: "MCQ" | "Long";
}

export function filterSummariesForTable(
  filters: TableFilters,
  summaries: import("@/lib/questionSummary").QuestionSummary[],
  isSolved: (id: string) => boolean
): QuestionTableRow[] {
  let pool = summaries;

  if (filters.competitions && filters.competitions.length > 0) {
    const allowed = new Set(filters.competitions);
    pool = pool.filter((q) => q.competition && allowed.has(q.competition));
  }

  if (filters.difficulties && filters.difficulties.length > 0) {
    const allowed = new Set(filters.difficulties);
    pool = pool.filter((q) => allowed.has(q.difficulty));
  }

  if (filters.topic) {
    pool = pool.filter((q) => getSimpleTopic(q.topic) === filters.topic);
  }

  if (filters.type === "mcq") {
    pool = pool.filter((q) => q.isMcq);
  } else if (filters.type === "long") {
    pool = pool.filter((q) => !q.isMcq);
  }

  if (filters.keyword?.trim()) {
    const terms = filters.keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    pool = pool.filter((q) => {
      const hay = `${q.preview} ${q.topic} ${q.examSource} ${q.curriculum} ${q.id}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  if (filters.statuses?.length === 1) {
    if (filters.statuses[0] === "solved") {
      pool = pool.filter((q) => isSolved(q.id));
    } else {
      pool = pool.filter((q) => !isSolved(q.id));
    }
  }

  return pool.map((q) => ({
    question: {
      id: q.id,
      curriculum: q.curriculum,
      competition: q.competition,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.preview,
    },
    solved: isSolved(q.id),
    type: q.isMcq ? "MCQ" : "Long",
  }));
}

export function filterQuestionsForTable(
  filters: TableFilters,
  allQuestions: Question[],
  isSolved: (id: string) => boolean
): QuestionTableRow[] {
  let pool = filterQuestionList(allQuestions, {
    keyword: filters.keyword || undefined,
  });

  if (filters.competitions && filters.competitions.length > 0) {
    const allowed = new Set(filters.competitions);
    pool = pool.filter((q) => q.competition && allowed.has(q.competition));
  }

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

  if (filters.statuses?.length === 1) {
    if (filters.statuses[0] === "solved") {
      pool = pool.filter((q) => isSolved(q.id));
    } else {
      pool = pool.filter((q) => !isSolved(q.id));
    }
  }

  return pool.map((question) => ({
    question,
    solved: isSolved(question.id),
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

export function getUniqueTopics(questions: Question[]): string[] {
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
  Geometry: "Geometry",
  "Number Theory": "Number Theory",
  "Counting & Probability": "Counting & Probability",
  "Networks and Time Series": "Networks",
  "Mathematical Reasoning": "Proof",
  Proof: "Proof",
  "Mathematical Modelling": "Modelling",
};

const SIMPLE_TOPIC_ORDER = [
  "Algebra",
  "Geometry",
  "Number Theory",
  "Counting & Probability",
  "Functions",
  "Calculus",
  "Trigonometry",
  "Probability & Statistics",
  "Vectors",
  "Sequences & Series",
  "Financial Maths",
  "Networks",
  "Modelling",
  "Proof",
];

export function getSimpleTopic(topic: string): string {
  return TOPIC_TO_SIMPLE[topic] ?? topic;
}

/** Unique simple topics present in the question bank, in a fixed sensible order. */
export function getSimpleTopics(
  questions: Array<{ topic: string }>
): string[] {
  const present = new Set(questions.map((q) => getSimpleTopic(q.topic)));
  const ordered = SIMPLE_TOPIC_ORDER.filter((t) => present.has(t));
  const extras = [...present].filter((t) => !SIMPLE_TOPIC_ORDER.includes(t)).sort();
  return [...ordered, ...extras];
}
