import { unstable_cache } from "next/cache";
import type { Question } from "@/types/question";
import { isMcqQuestion } from "@/lib/questionUtils";
import type { SprintQuestion } from "@/lib/sprint";
import { createAnonClient, isSupabaseConfigured } from "@/lib/supabase/server";
import questionsHsc from "@/data/questions-hsc.json";
import questionsIb from "@/data/questions-ib.json";
import questionsAp from "@/data/questions-ap.json";
import questionsAlevel from "@/data/questions-alevel.json";
import questionsAmc from "@/data/questions-amc.json";

export interface SprintPoolItem {
  question: SprintQuestion;
  correctIndex: number;
}

function toSprintQuestion(full: {
  id: string;
  questionText: string;
  choices?: string[];
  difficulty: string;
  image?: string;
  questionImage?: string;
}): SprintQuestion {
  const imageUrl =
    full.image && full.image !== "none" ? full.image : full.questionImage;
  return {
    id: full.id,
    questionText: full.questionText,
    choices: full.choices ?? [],
    difficulty: full.difficulty,
    imageUrl: imageUrl || undefined,
  };
}

function fromJsonBank(): SprintPoolItem[] {
  const all = [
    ...(questionsAmc as Question[]),
    ...(questionsHsc as Question[]),
    ...(questionsIb as Question[]),
    ...(questionsAp as Question[]),
    ...(questionsAlevel as Question[]),
  ];
  return all
    .filter((q) => isMcqQuestion(q) && q.difficulty === "Easy" && typeof q.correctIndex === "number")
    .map((q) => ({
      question: toSprintQuestion(q),
      correctIndex: q.correctIndex as number,
    }));
}

/** null = unknown; false after probing a DB without migration 004. */
let sprintVerifiedColumnAvailable: boolean | null = null;

async function loadEasyMcqPool(): Promise<SprintPoolItem[]> {
  if (!isSupabaseConfigured()) return fromJsonBank();

  try {
    const supabase = createAnonClient();
    const rows: {
      id: string;
      question_text: string;
      choices: string[] | null;
      correct_index: number | null;
      difficulty: string;
      image_url: string | null;
    }[] = [];
    const PAGE = 1000;
    let useVerified = sprintVerifiedColumnAvailable !== false;

    for (let from = 0; ; from += PAGE) {
      let query = supabase
        .from("questions")
        .select("id, question_text, choices, correct_index, difficulty, image_url")
        .eq("difficulty", "Easy")
        .not("correct_index", "is", null)
        .order("id")
        .range(from, from + PAGE - 1);
      if (useVerified) query = query.eq("verified", true);

      const { data, error } = await query;
      if (error) {
        if (
          useVerified &&
          (error.code === "42703" ||
            (typeof error.message === "string" && error.message.includes("verified")))
        ) {
          sprintVerifiedColumnAvailable = false;
          useVerified = false;
          from -= PAGE;
          continue;
        }
        throw error;
      }
      if (useVerified) sprintVerifiedColumnAvailable = true;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    const pool = rows
      .filter(
        (r) =>
          Array.isArray(r.choices) &&
          r.choices.length >= 4 &&
          typeof r.correct_index === "number"
      )
      .map((r) => ({
        question: toSprintQuestion({
          id: r.id,
          questionText: r.question_text,
          choices: r.choices ?? undefined,
          difficulty: r.difficulty,
          image: r.image_url ?? undefined,
        }),
        correctIndex: r.correct_index as number,
      }));

    return pool.length > 0 ? pool : fromJsonBank();
  } catch (err) {
    console.error("Sprint pool fetch failed, using JSON fallback:", err);
    return fromJsonBank();
  }
}

/** Easy MCQ pool for problem sprint — cached across requests. */
export const getCachedEasySprintPool = unstable_cache(
  loadEasyMcqPool,
  ["easy-sprint-pool-v3-verified"],
  { revalidate: 300 }
);

/**
 * Pick a random Easy MCQ, excluding ids already shown.
 */
export async function pickProblemPoolQuestion(
  excludeIds: Set<string>
): Promise<SprintPoolItem | null> {
  const pool = await getCachedEasySprintPool();
  const available = pool.filter((item) => !excludeIds.has(item.question.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/** Resolve a pool item by id (for grading without a full DB row fetch). */
export async function getSprintPoolItem(
  id: string
): Promise<SprintPoolItem | null> {
  const pool = await getCachedEasySprintPool();
  return pool.find((item) => item.question.id === id) ?? null;
}

/** Count of Easy MCQs available for problem sprint. */
export async function getProblemPoolSize(): Promise<number> {
  const pool = await getCachedEasySprintPool();
  return pool.length;
}

/** Prefetch several unique pool items for a sprint start. */
export async function pickProblemPoolBatch(
  count: number,
  excludeIds: Set<string> = new Set()
): Promise<SprintPoolItem[]> {
  const pool = await getCachedEasySprintPool();
  const available = pool.filter((item) => !excludeIds.has(item.question.id));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, count);
}

/** Build id → correctIndex map for a batch (sent to client for instant feedback). */
export function answerKeyFromBatch(batch: SprintPoolItem[]): Record<string, number> {
  return Object.fromEntries(batch.map((item) => [item.question.id, item.correctIndex]));
}
