import type { Question } from "@/types/question";
import { getAllQuestions } from "@/lib/questions";
import { isMcqQuestion } from "@/lib/questionUtils";
import type { SprintQuestion } from "@/lib/sprint";

function toSprintQuestion(full: Question): SprintQuestion {
  return {
    id: full.id,
    questionText: full.questionText,
    choices: full.choices ?? [],
    difficulty: full.difficulty,
    imageUrl:
      full.image && full.image !== "none" ? full.image : full.questionImage,
  };
}

/**
 * Pick a random Easy MCQ from all competitions, excluding ids already shown.
 */
export async function pickProblemPoolQuestion(
  excludeIds: Set<string>
): Promise<{ question: SprintQuestion; full: Question } | null> {
  const all = await getAllQuestions();
  const pool = all.filter(
    (q) =>
      isMcqQuestion(q) &&
      q.difficulty === "Easy" &&
      !excludeIds.has(q.id)
  );
  if (pool.length === 0) return null;

  const full = pool[Math.floor(Math.random() * pool.length)];
  return { full, question: toSprintQuestion(full) };
}

/** Count of Easy MCQs available for problem sprint. */
export async function getProblemPoolSize(): Promise<number> {
  const all = await getAllQuestions();
  return all.filter((q) => isMcqQuestion(q) && q.difficulty === "Easy").length;
}
