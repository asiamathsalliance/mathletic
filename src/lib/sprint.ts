import type { Difficulty } from "@/types/question";

export const SPRINT_DURATION_SECONDS = 300;
/** Grace period for network latency on the final answer. */
export const SPRINT_GRACE_MS = 3_000;
/** Max sprints a user can start per day. */
export const SPRINT_DAILY_LIMIT = 30;

export type SprintMode = "easy" | "medium" | "hard" | "mixed";

export const SPRINT_MODES: { id: SprintMode; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "Warm-up problems" },
  { id: "medium", label: "Medium", blurb: "Solid practice" },
  { id: "hard", label: "Hard", blurb: "Late-contest grind" },
  { id: "mixed", label: "Mixed", blurb: "Ramps up as the clock runs" },
];

/** Base points per difficulty (spec: 10 / 20 / 35). */
export const SPRINT_BASE_POINTS: Record<Difficulty, number> = {
  Easy: 10,
  Medium: 20,
  Hard: 35,
};

/** Expected answer time per difficulty, for the speed multiplier. */
export const SPRINT_EXPECTED_SECONDS: Record<Difficulty, number> = {
  Easy: 20,
  Medium: 35,
  Hard: 50,
};

/** Speed multiplier: faster than expected scores more, clamped to 0.5–1.5. */
export function sprintSpeedMultiplier(difficulty: Difficulty, timeMs: number): number {
  const expected = SPRINT_EXPECTED_SECONDS[difficulty];
  const actual = Math.max(1, timeMs / 1000);
  return Math.min(1.5, Math.max(0.5, expected / actual));
}

export function sprintPoints(difficulty: Difficulty, timeMs: number, correct: boolean): number {
  if (!correct) return 0;
  return Math.round(SPRINT_BASE_POINTS[difficulty] * sprintSpeedMultiplier(difficulty, timeMs));
}

/**
 * Time-weighted difficulty curve for Mixed mode: early questions skew easy,
 * late questions skew hard. `elapsedFraction` is 0 at start, 1 at the end.
 */
export function mixedModeWeights(elapsedFraction: number): Record<Difficulty, number> {
  const t = Math.min(1, Math.max(0, elapsedFraction));
  if (t < 1 / 3) return { Easy: 0.6, Medium: 0.3, Hard: 0.1 };
  if (t < 2 / 3) return { Easy: 0.25, Medium: 0.5, Hard: 0.25 };
  return { Easy: 0.1, Medium: 0.3, Hard: 0.6 };
}

export function difficultiesForMode(mode: SprintMode): Difficulty[] {
  if (mode === "easy") return ["Easy"];
  if (mode === "medium") return ["Medium"];
  if (mode === "hard") return ["Hard"];
  return ["Easy", "Medium", "Hard"];
}

/** Question payload sent to the sprint client (no answer/solution). */
export interface SprintQuestion {
  id: string;
  questionText: string;
  choices: string[];
  difficulty: Difficulty;
  imageUrl?: string;
}
