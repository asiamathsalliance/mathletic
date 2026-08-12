/**
 * Pure question helpers safe to import from both server and client code.
 * Data fetching lives in src/lib/questions.ts (server-only).
 */
import type { Question } from "@/types/question";
import { getTopicNamesForCanonical } from "@/lib/curriculumStreams";
import { interpretSearchQuery } from "@/lib/searchInterpret";

export function isMcqQuestion(q: Question): boolean {
  return Boolean(q.choices && q.choices.length >= 4 && typeof q.correctIndex === "number");
}

export function isLongAnswerQuestion(q: Question): boolean {
  return !isMcqQuestion(q);
}

/**
 * Display label like "2004 · AMC 10B" (never "2004 · AMC 10B 2004").
 * Strips a trailing year from examSource when it matches question.year.
 */
export function formatQuestionSourceLabel(question: {
  year: number;
  examSource?: string | null;
}): string {
  const year = question.year;
  let source = (question.examSource ?? "").trim();
  if (!source) return year ? String(year) : "";

  if (year) {
    source = source.replace(new RegExp(`\\s+${year}\\s*$`), "").trim();
  }
  // Fallback: strip any trailing 4-digit year (e.g. mismatched amcYear)
  source = source.replace(/\s+(19|20)\d{2}\s*$/, "").trim();

  if (!source) return year ? String(year) : "";
  if (!year) return source;
  return `${year} · ${source}`;
}

/** Simple seeded RNG for deterministic "random" selection. */
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/** Fisher-Yates shuffle with optional seed for reproducibility. */
export function shuffleQuestions<T>(items: T[], seed?: number): T[] {
  const arr = [...items];
  const rng = seed != null ? seededRandom(seed) : () => Math.random();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Keyword-only search (all terms must match). */
export function searchQuestionList(questions: Question[], query: string): Question[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  return questions.filter((question) => {
    const searchable = [
      question.curriculum,
      question.topic,
      question.subtopic,
      question.examSource,
      question.difficulty,
      question.questionText,
      question.solution,
      ...question.tags,
      String(question.year),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

/** Lightweight shape used by list/search UIs (no solutions/choices). */
export type SearchableSummary = {
  id: string;
  curriculum: string;
  topic: string;
  difficulty: string;
  year?: number;
  examSource?: string;
  preview: string;
  amcYear?: number;
  problemNumber?: number;
};

function summarySearchBlob(s: SearchableSummary): string {
  return [
    s.id,
    s.curriculum,
    s.topic,
    s.difficulty,
    s.examSource,
    s.preview,
    s.year,
    s.amcYear,
    s.problemNumber != null ? `problem ${s.problemNumber}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Keyword search over summaries (list pages / dropdown — never loads solutions). */
export function searchSummaryList(summaries: SearchableSummary[], query: string): SearchableSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return summaries.filter((s) => {
    const blob = summarySearchBlob(s);
    return terms.every((term) => blob.includes(term));
  });
}

/**
 * AI-style search: interprets natural language (e.g. "IB trig questions")
 * into curriculum, topic, difficulty and filters questions accordingly.
 */
export function searchQuestionListAI(questions: Question[], query: string): Question[] {
  const q = query.trim();
  if (!q) return [];

  const { curriculum, topic, difficulty, keywords } = interpretSearchQuery(q);
  const hasInterpreted =
    curriculum != null || topic != null || difficulty != null || keywords.length > 0;

  if (!hasInterpreted) {
    return searchQuestionList(questions, q);
  }

  let result = questions;

  if (curriculum) {
    result = result.filter((question) => question.curriculum === curriculum);
  }
  if (topic) {
    const topicNames = getTopicNamesForCanonical(topic) ?? [topic];
    result = result.filter((question) => topicNames.includes(question.topic));
  }
  if (difficulty) {
    result = result.filter((question) => question.difficulty === difficulty);
  }

  if (keywords.length > 0) {
    const searchableText = (question: Question) =>
      [
        question.questionText,
        question.solution,
        question.topic,
        question.subtopic,
        ...question.tags,
      ]
        .join(" ")
        .toLowerCase();
    result = result.filter((question) => {
      const text = searchableText(question);
      return keywords.some((kw) => text.includes(kw));
    });
  }

  return result;
}

/** Same interpret+filter path as searchQuestionListAI, but for lightweight summaries. */
export function searchSummaryListAI(
  summaries: SearchableSummary[],
  query: string
): SearchableSummary[] {
  const q = query.trim();
  if (!q) return [];

  const { curriculum, topic, difficulty, keywords } = interpretSearchQuery(q);
  const hasInterpreted =
    curriculum != null || topic != null || difficulty != null || keywords.length > 0;

  if (!hasInterpreted) {
    return searchSummaryList(summaries, q);
  }

  let result = summaries;

  if (curriculum) {
    result = result.filter((s) => s.curriculum === curriculum);
  }
  if (topic) {
    const topicNames = getTopicNamesForCanonical(topic) ?? [topic];
    result = result.filter((s) => topicNames.includes(s.topic));
  }
  if (difficulty) {
    result = result.filter((s) => s.difficulty === difficulty);
  }

  if (keywords.length > 0) {
    result = result.filter((s) => {
      const text = summarySearchBlob(s);
      return keywords.some((kw) => text.includes(kw));
    });
  }

  return result;
}

/** Filter questions by explicit curriculum, topic, difficulty and optional keyword. */
export function filterQuestionList(
  questions: Question[],
  filters: {
    curriculum?: string;
    topic?: string;
    difficulty?: string;
    keyword?: string;
  }
): Question[] {
  let result = questions;

  if (filters.curriculum) {
    result = result.filter((q) => q.curriculum === filters.curriculum);
  }
  if (filters.topic) {
    const topicNames = getTopicNamesForCanonical(filters.topic) ?? [filters.topic];
    result = result.filter((q) => topicNames.includes(q.topic));
  }
  if (filters.difficulty) {
    result = result.filter((q) => q.difficulty === filters.difficulty);
  }

  if (filters.keyword?.trim()) {
    const k = filters.keyword.trim().toLowerCase();
    result = result.filter((q) => {
      const text = [
        q.questionText,
        q.solution,
        q.topic,
        q.subtopic,
        ...q.tags,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(k) || k.split(/\s+/).some((w) => text.includes(w));
    });
  }

  return result;
}

/** Filter summaries for list UIs (same filters as filterQuestionList). */
export function filterSummaryList(
  summaries: SearchableSummary[],
  filters: {
    curriculum?: string;
    topic?: string;
    difficulty?: string;
    keyword?: string;
  }
): SearchableSummary[] {
  let result = summaries;

  if (filters.curriculum) {
    result = result.filter((s) => s.curriculum === filters.curriculum);
  }
  if (filters.topic) {
    const topicNames = getTopicNamesForCanonical(filters.topic) ?? [filters.topic];
    result = result.filter((s) => topicNames.includes(s.topic));
  }
  if (filters.difficulty) {
    result = result.filter((s) => s.difficulty === filters.difficulty);
  }

  if (filters.keyword?.trim()) {
    const terms = filters.keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    result = result.filter((s) => {
      const text = summarySearchBlob(s);
      return terms.every((t) => text.includes(t));
    });
  }

  return result;
}
