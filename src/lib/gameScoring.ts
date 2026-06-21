import type { Difficulty } from "@/types/question";
import {
  BASE_POINTS,
  BOSS_SELF_MARK_POINTS,
  BOSS_TIME_BONUS_THRESHOLD,
  BOSS_TIME_BONUS_XP,
  COMBO_CORRECTS_FOR_MAX,
  COMBO_INCREMENT,
  COMBO_MAX,
  type BossSelfMark,
} from "@/lib/playConfig";

export function getBasePoints(difficulty: Difficulty): number {
  return BASE_POINTS[difficulty];
}

export function computeComboMultiplier(consecutiveCorrect: number): number {
  const bonus = Math.min(consecutiveCorrect, COMBO_CORRECTS_FOR_MAX) * COMBO_INCREMENT;
  return Math.min(1 + bonus, COMBO_MAX);
}

export function scoreMcqAnswer(opts: {
  correct: boolean;
  timedOut: boolean;
  timeUsedMs: number;
  timeLimitMs: number;
  basePoints: number;
  comboMultiplier: number;
  consecutiveCorrect: number;
}): {
  points: number;
  nextComboMultiplier: number;
  nextConsecutiveCorrect: number;
} {
  const { correct, timedOut, timeUsedMs, timeLimitMs, basePoints, comboMultiplier, consecutiveCorrect } =
    opts;

  if (!correct || timedOut) {
    return {
      points: 0,
      nextComboMultiplier: 1,
      nextConsecutiveCorrect: 0,
    };
  }

  const timeRatio = Math.min(timeUsedMs / timeLimitMs, 1);
  const rawPoints = basePoints * (1 - 0.5 * timeRatio);
  const points = Math.round(rawPoints * comboMultiplier);

  const nextConsecutiveCorrect = consecutiveCorrect + 1;
  const nextComboMultiplier = computeComboMultiplier(nextConsecutiveCorrect);

  return { points, nextComboMultiplier, nextConsecutiveCorrect };
}

export function scoreBossAnswer(opts: {
  selfMark: BossSelfMark;
  timeUsedMs: number;
  timeLimitMs: number;
}): { baseXp: number; timeBonus: number; totalXp: number } {
  const baseXp = BOSS_SELF_MARK_POINTS[opts.selfMark];
  const underThreshold =
    opts.timeUsedMs <= opts.timeLimitMs * BOSS_TIME_BONUS_THRESHOLD;
  const timeBonus = underThreshold && baseXp > 0 ? BOSS_TIME_BONUS_XP : 0;
  return { baseXp, timeBonus, totalXp: baseXp + timeBonus };
}

export function xpToLevel(xp: number, thresholds: number[]): number {
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

export function xpProgressInLevel(
  xp: number,
  thresholds: number[]
): { current: number; needed: number; percent: number } {
  const level = xpToLevel(xp, thresholds);
  const floor = thresholds[level - 1] ?? 0;
  const ceiling = thresholds[level] ?? thresholds[thresholds.length - 1] + 1000;
  const current = xp - floor;
  const needed = ceiling - floor;
  const percent = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;
  return { current, needed, percent };
}
