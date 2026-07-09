import type { Difficulty, Question } from "@/types/question";
import { getAllQuestions } from "@/lib/questions";
import { isMcqQuestion } from "@/lib/questionUtils";
import { getSimpleTopic } from "@/lib/questionTable";
import {
  difficultiesForMode,
  mixedModeWeights,
  type SprintMode,
  type SprintQuestion,
} from "@/lib/sprint";

/**
 * Pick the next sprint question using the time-weighted difficulty curve,
 * excluding ids already shown in this session. Returns null when the pool
 * for the mode is exhausted.
 */
export async function pickSprintQuestion(options: {
  mode: SprintMode;
  topic: string | null;
  excludeIds: Set<string>;
  elapsedFraction: number;
}): Promise<{ question: SprintQuestion; full: Question } | null> {
  const { mode, topic, excludeIds, elapsedFraction } = options;

  const all = await getAllQuestions();
  const allowed = new Set(difficultiesForMode(mode));
  let pool = all.filter(
    (q) => isMcqQuestion(q) && allowed.has(q.difficulty) && !excludeIds.has(q.id)
  );
  if (topic) {
    pool = pool.filter((q) => getSimpleTopic(q.topic) === topic);
  }
  if (pool.length === 0) return null;

  let candidates: Question[];
  if (mode === "mixed") {
    const weights = mixedModeWeights(elapsedFraction);
    const byDifficulty: Record<Difficulty, Question[]> = { Easy: [], Medium: [], Hard: [] };
    for (const q of pool) byDifficulty[q.difficulty].push(q);

    // Weighted pick of a non-empty difficulty bucket.
    const buckets = (Object.keys(byDifficulty) as Difficulty[]).filter(
      (d) => byDifficulty[d].length > 0
    );
    const totalWeight = buckets.reduce((s, d) => s + weights[d], 0);
    let roll = Math.random() * totalWeight;
    let chosen: Difficulty = buckets[0];
    for (const d of buckets) {
      roll -= weights[d];
      if (roll <= 0) {
        chosen = d;
        break;
      }
    }
    candidates = byDifficulty[chosen];
  } else {
    candidates = pool;
  }

  const full = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    full,
    question: {
      id: full.id,
      questionText: full.questionText,
      choices: full.choices ?? [],
      difficulty: full.difficulty,
      imageUrl:
        full.image && full.image !== "none" ? full.image : full.questionImage,
    },
  };
}

/** Simple topics available for sprint (topics that have at least one MCQ). */
export async function getSprintTopics(): Promise<string[]> {
  const all = await getAllQuestions();
  const topics = new Set(all.filter(isMcqQuestion).map((q) => getSimpleTopic(q.topic)));
  return [...topics].sort();
}
