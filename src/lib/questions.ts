/**
 * Server-side question data access. All getters are async and cached per
 * request. Questions come from Supabase Postgres when configured; the bundled
 * JSON files remain as a source-of-record fallback for local dev without env
 * vars (and as a backup of the original bank).
 *
 * Pure helpers shared with client components live in src/lib/questionUtils.ts.
 */
import { cache } from "react";
import type { Competition, Question } from "@/types/question";
import { COMPETITION_TO_LABEL } from "@/types/question";
import questionsHsc from "@/data/questions-hsc.json";
import questionsIb from "@/data/questions-ib.json";
import questionsAp from "@/data/questions-ap.json";
import questionsAlevel from "@/data/questions-alevel.json";
import { createAnonClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  filterQuestionList,
  isMcqQuestion,
  searchQuestionListAI,
  seededRandom,
} from "@/lib/questionUtils";

export { isMcqQuestion, isLongAnswerQuestion, shuffleQuestions } from "@/lib/questionUtils";

const LABEL_FROM_CURRICULUM: Record<string, Competition> = {
  HSC: "HSC",
  IB: "IB",
  AP: "AP",
  "A-Level": "A_LEVEL",
};

const jsonQuestions: Question[] = [
  ...(questionsHsc as Question[]),
  ...(questionsIb as Question[]),
  ...(questionsAp as Question[]),
  ...(questionsAlevel as Question[]),
].map((q) => ({ ...q, competition: LABEL_FROM_CURRICULUM[q.curriculum] }));

interface QuestionRow {
  id: string;
  competition: Competition;
  stream: string | null;
  topic: string;
  subtopic: string | null;
  year: number | null;
  exam_source: string | null;
  difficulty: Question["difficulty"];
  amc_year: number | null;
  amc_variant: "A" | "B" | null;
  problem_number: number | null;
  difficulty_bucket: string | null;
  question_text: string;
  image_url: string | null;
  choices: string[] | null;
  correct_index: number | null;
  solution: string | null;
  solution_image_url: string | null;
  tags: string[] | null;
}

function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    curriculum: COMPETITION_TO_LABEL[row.competition] ?? row.competition,
    competition: row.competition,
    stream: (row.stream as Question["stream"]) ?? undefined,
    topic: row.topic,
    subtopic: row.subtopic ?? "",
    year: row.year ?? row.amc_year ?? 0,
    examSource: row.exam_source ?? "",
    difficulty: row.difficulty,
    amcYear: row.amc_year ?? undefined,
    amcVariant: row.amc_variant ?? undefined,
    problemNumber: row.problem_number ?? undefined,
    difficultyBucket: row.difficulty_bucket ?? undefined,
    questionText: row.question_text,
    image: row.image_url ?? undefined,
    choices: row.choices ?? undefined,
    correctIndex: row.correct_index ?? undefined,
    solution: row.solution ?? "",
    solutionImage: row.solution_image_url ?? undefined,
    tags: row.tags ?? [],
  };
}

/**
 * All questions, cached per request. Reads from Supabase when configured and
 * non-empty; falls back to the bundled JSON otherwise.
 */
export const getAllQuestions = cache(async (): Promise<Question[]> => {
  if (!isSupabaseConfigured()) return jsonQuestions;

  try {
    const supabase = createAnonClient();
    const rows: QuestionRow[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...((data ?? []) as QuestionRow[]));
      if (!data || data.length < PAGE) break;
    }
    if (rows.length === 0) return jsonQuestions;
    return rows.map(rowToQuestion);
  } catch (err) {
    console.error("Supabase questions fetch failed, using JSON fallback:", err);
    return jsonQuestions;
  }
});

export const getQuestionById = cache(async (id: string): Promise<Question | undefined> => {
  if (!isSupabaseConfigured()) {
    return jsonQuestions.find((q) => q.id === id);
  }
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (data) return rowToQuestion(data as QuestionRow);
    return jsonQuestions.find((q) => q.id === id);
  } catch (err) {
    console.error("Supabase question fetch failed, using JSON fallback:", err);
    return jsonQuestions.find((q) => q.id === id);
  }
});

/** All questions for a curriculum label (e.g. "HSC", "AMC 10"). */
export async function getQuestionsByCurriculum(curriculum: string): Promise<Question[]> {
  const questions = await getAllQuestions();
  return questions.filter((q) => q.curriculum === curriculum);
}

/** Up to `count` questions for a curriculum mock, deterministically selected by mockId. */
export async function getMockQuestions(
  curriculum: string,
  mockId: string,
  count: number = 3
): Promise<Question[]> {
  const pool = await getQuestionsByCurriculum(curriculum);
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

/** AI-style natural language search across the whole bank. */
export async function searchQuestionsAI(query: string): Promise<Question[]> {
  const questions = await getAllQuestions();
  return searchQuestionListAI(questions, query);
}

/** Filter questions by explicit curriculum, topic, difficulty and optional keyword. */
export async function getQuestionsByFilters(filters: {
  curriculum?: string;
  topic?: string;
  difficulty?: string;
  keyword?: string;
}): Promise<Question[]> {
  const questions = await getAllQuestions();
  return filterQuestionList(questions, filters);
}
