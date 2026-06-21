import type { Question, Difficulty } from "@/types/question";

type SolvedEntry = {
  solvedAt: number;
  difficulty: Difficulty;
};

type SolvedMap = Record<string, SolvedEntry>;

const STORAGE_KEY = "math-exam-prep-solved-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse(json: string | null): SolvedMap {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") {
      return parsed as SolvedMap;
    }
  } catch {
    // ignore
  }
  return {};
}

export function getSolvedMap(): SolvedMap {
  if (!isBrowser()) return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

function setSolvedMap(map: SolvedMap): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / privacy errors
  }
}

export function isQuestionSolved(id: string): boolean {
  const map = getSolvedMap();
  return Boolean(map[id]);
}

export function markQuestionSolved(question: Question): void {
  if (!isBrowser()) return;
  const map = getSolvedMap();
  if (map[question.id]) return;

  map[question.id] = {
    solvedAt: Date.now(),
    difficulty: question.difficulty,
  };

  setSolvedMap(map);
}

export function getSolvedCountsByDifficulty(allQuestions: Question[]): {
  total: number;
  solvedTotal: number;
  byDifficulty: Record<Difficulty, { total: number; solved: number }>;
} {
  const byDifficulty: Record<Difficulty, { total: number; solved: number }> = {
    Easy: { total: 0, solved: 0 },
    Medium: { total: 0, solved: 0 },
    Hard: { total: 0, solved: 0 },
  };

  const solvedMap = getSolvedMap();
  let solvedTotal = 0;

  for (const q of allQuestions) {
    const bucket = byDifficulty[q.difficulty];
    bucket.total += 1;
    if (solvedMap[q.id]) {
      bucket.solved += 1;
      solvedTotal += 1;
    }
  }

  const total = allQuestions.length;
  return { total, solvedTotal, byDifficulty };
}

export function getCurriculumProgress(
  allQuestions: Question[]
): Record<string, { total: number; solved: number; percent: number }> {
  const solvedMap = getSolvedMap();
  const result: Record<string, { total: number; solved: number; percent: number }> = {};

  for (const q of allQuestions) {
    const key = q.curriculum;
    if (!result[key]) {
      result[key] = { total: 0, solved: 0, percent: 0 };
    }
    result[key].total += 1;
    if (solvedMap[q.id]) {
      result[key].solved += 1;
    }
  }

  Object.keys(result).forEach((key) => {
    const entry = result[key];
    entry.percent = entry.total > 0 ? Math.round((entry.solved / entry.total) * 100) : 0;
  });

  return result;
}


