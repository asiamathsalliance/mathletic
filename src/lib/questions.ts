import type { Question } from "@/types/question";
import questionsHsc from "@/data/questions-hsc.json";
import questionsIb from "@/data/questions-ib.json";
import questionsAp from "@/data/questions-ap.json";
import questionsAlevel from "@/data/questions-alevel.json";
import { getTopicNamesForCanonical } from "@/lib/curriculumStreams";
import { interpretSearchQuery } from "@/lib/searchInterpret";
import type { PlayCategory } from "@/lib/playConfig";
import { playCategoryToCurriculum } from "@/lib/playConfig";

const questions: Question[] = [
  ...(questionsHsc as Question[]),
  ...(questionsIb as Question[]),
  ...(questionsAp as Question[]),
  ...(questionsAlevel as Question[]),
];

export function getAllQuestions(): Question[] {
  return questions;
}

/** Get all questions for a curriculum (for practice exams). */
export function getQuestionsByCurriculum(curriculum: string): Question[] {
  return questions.filter((q) => q.curriculum === curriculum);
}

/** Simple seeded RNG for deterministic "random" mock selection. */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/** Get up to `count` questions for a curriculum mock, deterministically selected by mockId. */
export function getMockQuestions(
  curriculum: string,
  mockId: string,
  count: number = 3
): Question[] {
  const pool = getQuestionsByCurriculum(curriculum);
  if (pool.length === 0) return [];
  const seed = mockId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(count, pool.length)).map((i) => pool[i]);
}

/** Keyword-only search (all terms must match). */
export function searchQuestions(query: string): Question[] {
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

/**
 * AI-style search: interprets natural language (e.g. "IB trig questions")
 * into curriculum, topic, difficulty and filters questions accordingly.
 * Also applies keyword matching on remaining words for content/tags.
 */
export function searchQuestionsAI(query: string): Question[] {
  const q = query.trim();
  if (!q) return [];

  const { curriculum, topic, difficulty, keywords } = interpretSearchQuery(q);
  const hasInterpreted =
    curriculum != null || topic != null || difficulty != null || keywords.length > 0;

  if (!hasInterpreted) {
    return searchQuestions(q);
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

/**
 * Filter questions by explicit curriculum, topic, difficulty and optional keyword.
 * Used when the search page receives these from the URL (e.g. from AI search).
 */
export function getQuestionsByFilters(filters: {
  curriculum?: string;
  topic?: string;
  difficulty?: string;
  keyword?: string;
}): Question[] {
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

export function isMcqQuestion(q: Question): boolean {
  return Boolean(q.choices && q.choices.length >= 4 && typeof q.correctIndex === "number");
}

export function isLongAnswerQuestion(q: Question): boolean {
  return !isMcqQuestion(q);
}

export function getQuestionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function getPlayQuestionPool(
  category: PlayCategory,
  filters: { topic?: string; difficulty?: string }
): { mcq: Question[]; long: Question[] } {
  const curriculum = playCategoryToCurriculum(category);
  const pool = getQuestionsByFilters({ curriculum, ...filters });
  return {
    mcq: pool.filter(isMcqQuestion),
    long: pool.filter(isLongAnswerQuestion),
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

export function pickSessionQuestions(
  category: PlayCategory,
  filters: { topic?: string; difficulty?: string },
  mcqCount: number,
  seed: number
): { mcq: Question[]; boss: Question | null } {
  const { mcq, long } = getPlayQuestionPool(category, filters);
  const shuffledMcq = shuffleQuestions(mcq, seed);
  const shuffledLong = shuffleQuestions(long, seed + 1);
  return {
    mcq: shuffledMcq.slice(0, mcqCount),
    boss: shuffledLong[0] ?? null,
  };
}
