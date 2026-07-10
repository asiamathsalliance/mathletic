export const PROBLEM_SPRINT_DURATION_SECONDS = 300;
export const MULTIPLICATION_SPRINT_DURATION_SECONDS = 60;
/** @deprecated Use mode-specific duration helpers */
export const SPRINT_DURATION_SECONDS = PROBLEM_SPRINT_DURATION_SECONDS;
/** Grace period for network latency on the final answer. */
export const SPRINT_GRACE_MS = 3_000;
/** Max sprints a user can start per day per mode. */
export const SPRINT_DAILY_LIMIT = 30;

export type SprintModeType = "MULTIPLICATION" | "PROBLEM_POOL";

export function sprintDurationForMode(modeType: SprintModeType): number {
  return modeType === "MULTIPLICATION"
    ? MULTIPLICATION_SPRINT_DURATION_SECONDS
    : PROBLEM_SPRINT_DURATION_SECONDS;
}

export const SPRINT_MODE_TYPES: {
  id: SprintModeType;
  label: string;
  blurb: string;
  href: string;
  icon: "multiply" | "problem";
}[] = [
  {
    id: "MULTIPLICATION",
    label: "Multiplication Sprint",
    blurb: "Blast through as many times-tables as you can in 1 minute.",
    href: "/sprint/multiplication",
    icon: "multiply",
  },
  {
    id: "PROBLEM_POOL",
    label: "Problem Sprint",
    blurb: "Solve as many easy AMC-style problems as you can in 5 minutes.",
    href: "/sprint/problem",
    icon: "problem",
  },
];

/** Question payload sent to the problem sprint client (no answer/solution). */
export interface SprintQuestion {
  id: string;
  questionText: string;
  choices: string[];
  difficulty: string;
  imageUrl?: string;
}

export interface MultiplicationProblem {
  operandA: number;
  operandB: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Multiplication: 5 base + streak bonus (streak = consecutive correct before this answer). */
export function multiplicationPoints(correct: boolean, streakBefore: number): number {
  if (!correct) return 0;
  return 5 + Math.min(streakBefore, 10);
}

/** Problem pool: 10 * speed multiplier based on time taken. */
export function problemPoolPoints(correct: boolean, timeTakenSeconds: number): number {
  if (!correct) return 0;
  const multiplier = clamp(1.5 - timeTakenSeconds / 60, 0.5, 1.5);
  return Math.round(10 * multiplier);
}

/** Compute max consecutive correct streak from ordered attempt results. */
export function computeBestStreak(correctFlags: boolean[]): number {
  let best = 0;
  let current = 0;
  for (const c of correctFlags) {
    if (c) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/** Current streak before the next answer (consecutive correct at end of list). */
export function currentStreakBefore(correctFlags: boolean[]): number {
  let streak = 0;
  for (let i = correctFlags.length - 1; i >= 0; i--) {
    if (correctFlags[i]) streak += 1;
    else break;
  }
  return streak;
}

export function answerLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** Streak multiplier badge: 5+ → 2x, 10+ → 3x, 15+ → 4x, capped at 5x. */
export function streakMultiplier(streak: number): number | null {
  if (streak < 5) return null;
  return Math.min(5, Math.floor(streak / 5) + 1);
}

/** Ring stroke color from remaining seconds (green → amber → red). */
export function sprintTimerStrokeColor(
  remainingSeconds: number,
  durationSeconds: number
): string {
  const redCutoff = durationSeconds * 0.1;
  const amberCutoff = durationSeconds * 0.4;
  if (remainingSeconds <= redCutoff) return "#C94A3D";
  if (remainingSeconds <= amberCutoff) return "#C9941F";
  return "#2F7D4F";
}

export function sprintTimerUrgent(
  remainingSeconds: number,
  durationSeconds: number
): boolean {
  return remainingSeconds <= durationSeconds * 0.1;
}
