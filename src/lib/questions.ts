/**
 * Server-side question data access. All getters are async and cached per
 * request. Questions come from Supabase Postgres when configured; the bundled
 * JSON files remain as a source-of-record fallback for local dev without env
 * vars (and as a backup of the original bank).
 *
 * Prefer getQuestionSummaries() for list pages and getQuestionById() for detail.
 *
 * Note: `verified` filtering is applied only when the column exists (migration 004).
 * Until then, all DB rows are served — same as before that migration.
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Competition, Question } from "@/types/question";
import { COMPETITION_TO_LABEL } from "@/types/question";
import questionsHsc from "@/data/questions-hsc.json";
import questionsIb from "@/data/questions-ib.json";
import questionsAp from "@/data/questions-ap.json";
import questionsAlevel from "@/data/questions-alevel.json";
import questionsAmc from "@/data/questions-amc.json";
import { createAnonClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  filterQuestionList,
  searchQuestionListAI,
  seededRandom,
} from "@/lib/questionUtils";
import {
  interleaveSummaries,
  questionToSummary,
  rowToSummary,
  type QuestionSummary,
} from "@/lib/questionSummary";

export { isMcqQuestion, isLongAnswerQuestion, shuffleQuestions } from "@/lib/questionUtils";
export type { QuestionSummary } from "@/lib/questionSummary";
export { interleaveSummaries };

const LABEL_FROM_CURRICULUM: Record<string, Competition> = {
  HSC: "HSC",
  IB: "IB",
  AP: "AP",
  "A-Level": "A_LEVEL",
  "AMC 10": "AMC10",
  "AMC 12": "AMC12",
};

const jsonQuestions: Question[] = [
  ...(questionsAmc as Question[]),
  ...(questionsHsc as Question[]),
  ...(questionsIb as Question[]),
  ...(questionsAp as Question[]),
  ...(questionsAlevel as Question[]),
].map((q) => ({
  ...q,
  competition: q.competition ?? LABEL_FROM_CURRICULUM[q.curriculum],
  verified: true,
}));

const jsonSummaries: QuestionSummary[] = jsonQuestions.map(questionToSummary);

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
  verified?: boolean | null;
}

interface SummaryRow {
  id: string;
  competition: Competition;
  topic: string;
  year: number | null;
  exam_source: string | null;
  difficulty: Question["difficulty"];
  amc_year: number | null;
  amc_variant: "A" | "B" | null;
  problem_number: number | null;
  question_text: string;
  correct_index: number | null;
  verified?: boolean | null;
}

/** null = unknown, true/false = probed against this Supabase project. */
let verifiedColumnAvailable: boolean | null = null;

function isMissingVerifiedColumn(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "42703" ||
    (typeof e.message === "string" &&
      e.message.includes("verified") &&
      e.message.includes("does not exist"))
  );
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
    verified: row.verified !== false,
  };
}

const SUMMARY_SELECT_BASE =
  "id, competition, topic, year, exam_source, difficulty, amc_year, amc_variant, problem_number, question_text, correct_index";

async function fetchSummariesFromDb(): Promise<QuestionSummary[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAnonClient();
    const rows: SummaryRow[] = [];
    const PAGE = 1000;
    let useVerified = verifiedColumnAvailable !== false;

    for (let from = 0; ; from += PAGE) {
      const query = useVerified
        ? supabase
            .from("questions")
            .select(`${SUMMARY_SELECT_BASE}, verified`)
            .eq("verified", true)
            .order("id")
            .range(from, from + PAGE - 1)
        : supabase
            .from("questions")
            .select(SUMMARY_SELECT_BASE)
            .order("id")
            .range(from, from + PAGE - 1);

      const { data, error } = await query;
      if (error) {
        if (useVerified && isMissingVerifiedColumn(error)) {
          verifiedColumnAvailable = false;
          useVerified = false;
          console.warn(
            "questions.verified missing — run supabase/migrations/004_verified_and_typed_answers.sql. Serving all rows for now."
          );
          from -= PAGE; // retry this page without verified
          continue;
        }
        throw error;
      }
      if (useVerified) verifiedColumnAvailable = true;
      rows.push(...((data ?? []) as unknown as SummaryRow[]));
      if (!data || data.length < PAGE) break;
    }
    if (rows.length === 0) return null;
    return rows.map((row) =>
      rowToSummary({
        id: row.id,
        competition: row.competition,
        topic: row.topic,
        year: row.year,
        exam_source: row.exam_source,
        difficulty: row.difficulty,
        amc_year: row.amc_year,
        amc_variant: row.amc_variant,
        problem_number: row.problem_number,
        question_text: row.question_text.slice(0, 240),
        choices: row.correct_index != null ? ["", "", "", ""] : null,
      })
    );
  } catch (err) {
    console.error("Supabase summary fetch failed:", err);
    return null;
  }
}

/** Question bank is static — cache for minutes, not seconds. */
const BANK_REVALIDATE_SECONDS = 600;

const getCachedSummaries = unstable_cache(
  async () => {
    const fromDb = await fetchSummariesFromDb();
    return fromDb ?? jsonSummaries;
  },
  ["question-summaries-v8"],
  { revalidate: BANK_REVALIDATE_SECONDS }
);

export const getQuestionSummaries = cache(async (): Promise<QuestionSummary[]> => {
  if (!isSupabaseConfigured()) return jsonSummaries;
  return getCachedSummaries();
});

async function loadAllQuestionsFromDb(): Promise<Question[]> {
  const supabase = createAnonClient();
  const rows: QuestionRow[] = [];
  const PAGE = 1000;
  let useVerified = verifiedColumnAvailable !== false;

  for (let from = 0; ; from += PAGE) {
    let query = supabase.from("questions").select("*").order("id").range(from, from + PAGE - 1);
    if (useVerified) query = query.eq("verified", true);

    const { data, error } = await query;
    if (error) {
      if (useVerified && isMissingVerifiedColumn(error)) {
        verifiedColumnAvailable = false;
        useVerified = false;
        console.warn(
          "questions.verified missing — run migration 004. Serving all rows for now."
        );
        from -= PAGE;
        continue;
      }
      throw error;
    }
    if (useVerified) verifiedColumnAvailable = true;
    rows.push(...((data ?? []) as QuestionRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows.length > 0 ? rows.map(rowToQuestion) : jsonQuestions;
}

const getCachedAllQuestions = unstable_cache(
  async () => {
    try {
      return await loadAllQuestionsFromDb();
    } catch (err) {
      console.error("Supabase questions fetch failed, using JSON fallback:", err);
      return jsonQuestions;
    }
  },
  ["all-questions-v2"],
  { revalidate: BANK_REVALIDATE_SECONDS }
);

/** Full bank — prefer getQuestionSummaries / getQuestionsByTopic on list pages. */
export const getAllQuestions = cache(async (): Promise<Question[]> => {
  if (!isSupabaseConfigured()) return jsonQuestions;
  return getCachedAllQuestions();
});

async function fetchQuestionByIdFromDb(id: string): Promise<Question | undefined> {
  const supabase = createAnonClient();
  let useVerified = verifiedColumnAvailable !== false;

  for (let attempt = 0; attempt < 2; attempt++) {
    let query = supabase.from("questions").select("*").eq("id", id);
    if (useVerified) query = query.eq("verified", true);
    const { data, error } = await query.maybeSingle();
    if (error) {
      if (useVerified && isMissingVerifiedColumn(error)) {
        verifiedColumnAvailable = false;
        useVerified = false;
        console.warn(
          "questions.verified missing — run migration 004. Serving all rows for now."
        );
        continue;
      }
      throw error;
    }
    if (useVerified) verifiedColumnAvailable = true;
    if (data) return rowToQuestion(data as QuestionRow);
    return undefined;
  }
  return undefined;
}

export const getQuestionById = cache(async (id: string): Promise<Question | undefined> => {
  if (!isSupabaseConfigured()) {
    return jsonQuestions.find((q) => q.id === id);
  }
  try {
    const cached = await unstable_cache(
      () => fetchQuestionByIdFromDb(id),
      ["question-by-id-v2", id],
      { revalidate: BANK_REVALIDATE_SECONDS, tags: [`question:${id}`] }
    )();
    return cached ?? jsonQuestions.find((q) => q.id === id);
  } catch (err) {
    console.error("Supabase question fetch failed, using JSON fallback:", err);
    return jsonQuestions.find((q) => q.id === id);
  }
});

export interface TopicQuestionFilter {
  topic: string;
  /** DB competition id, e.g. AMC10 */
  competition?: Competition;
  /** Display curriculum label, e.g. HSC */
  curriculum?: string;
  stream?: string;
}

/**
 * Topic-scoped full questions for TopicPageClient (needs choices for MCQ cards).
 * Does not load the entire bank — filters in DB / JSON by topic.
 */
export const getQuestionsByTopic = cache(
  async (filter: TopicQuestionFilter): Promise<Question[]> => {
    const key = [
      "topic-questions-v1",
      filter.topic,
      filter.competition ?? "",
      filter.curriculum ?? "",
      filter.stream ?? "",
    ];

    const load = async (): Promise<Question[]> => {
      if (!isSupabaseConfigured()) {
        return jsonQuestions.filter(
          (q) =>
            q.topic === filter.topic &&
            (filter.competition
              ? q.competition === filter.competition
              : filter.curriculum
                ? q.curriculum === filter.curriculum
                : true) &&
            (filter.stream ? q.stream === undefined || q.stream === filter.stream : true)
        );
      }

      try {
        const supabase = createAnonClient();
        let useVerified = verifiedColumnAvailable !== false;
        const rows: QuestionRow[] = [];
        const PAGE = 1000;

        for (let from = 0; ; from += PAGE) {
          let query = supabase
            .from("questions")
            .select("*")
            .eq("topic", filter.topic)
            .order("id")
            .range(from, from + PAGE - 1);
          if (filter.competition) query = query.eq("competition", filter.competition);
          if (filter.stream) query = query.eq("stream", filter.stream);
          if (useVerified) query = query.eq("verified", true);

          const { data, error } = await query;
          if (error) {
            if (useVerified && isMissingVerifiedColumn(error)) {
              verifiedColumnAvailable = false;
              useVerified = false;
              from -= PAGE;
              continue;
            }
            throw error;
          }
          if (useVerified) verifiedColumnAvailable = true;
          rows.push(...((data ?? []) as QuestionRow[]));
          if (!data || data.length < PAGE) break;
        }

        let result = rows.map(rowToQuestion);
        if (filter.curriculum) {
          result = result.filter((q) => q.curriculum === filter.curriculum);
        }
        if (result.length > 0) return result;

        return jsonQuestions.filter(
          (q) =>
            q.topic === filter.topic &&
            (filter.competition
              ? q.competition === filter.competition
              : filter.curriculum
                ? q.curriculum === filter.curriculum
                : true) &&
            (filter.stream ? q.stream === undefined || q.stream === filter.stream : true)
        );
      } catch (err) {
        console.error("Supabase topic fetch failed, using JSON fallback:", err);
        return jsonQuestions.filter(
          (q) =>
            q.topic === filter.topic &&
            (filter.competition
              ? q.competition === filter.competition
              : filter.curriculum
                ? q.curriculum === filter.curriculum
                : true) &&
            (filter.stream ? q.stream === undefined || q.stream === filter.stream : true)
        );
      }
    };

    return unstable_cache(load, key, { revalidate: BANK_REVALIDATE_SECONDS })();
  }
);

export async function getQuestionsByCurriculum(curriculum: string): Promise<Question[]> {
  const questions = await getAllQuestions();
  return questions.filter((q) => q.curriculum === curriculum);
}

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

export async function searchQuestionsAI(query: string): Promise<Question[]> {
  const questions = await getAllQuestions();
  return searchQuestionListAI(questions, query);
}

export async function getQuestionsByFilters(filters: {
  curriculum?: string;
  topic?: string;
  difficulty?: string;
  keyword?: string;
}): Promise<Question[]> {
  const questions = await getAllQuestions();
  return filterQuestionList(questions, filters);
}
