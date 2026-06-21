import type { Curriculum, Difficulty } from "@/types/question";

export type PlayCategory = "HSC" | "IB" | "A-Level";

export const PLAY_CATEGORIES: PlayCategory[] = ["HSC", "IB", "A-Level"];

export const PLAY_CATEGORY_SLUG: Record<PlayCategory, string> = {
  HSC: "hsc",
  IB: "ib",
  "A-Level": "a-level",
};

export const SLUG_TO_PLAY_CATEGORY: Record<string, PlayCategory> = {
  hsc: "HSC",
  ib: "IB",
  "a-level": "A-Level",
};

export function playCategoryToCurriculum(category: PlayCategory): Curriculum {
  return category;
}

export function playCategoryFromSlug(slug: string): PlayCategory | undefined {
  return SLUG_TO_PLAY_CATEGORY[slug.toLowerCase()];
}

export const DEFAULT_MCQ_COUNT = 5;

export const MCQ_TIME_LIMITS_MS: Record<Difficulty, number> = {
  Easy: 15_000,
  Medium: 20_000,
  Hard: 30_000,
};

export const BOSS_TIME_LIMITS_MS: Record<Difficulty, number> = {
  Easy: 180_000,
  Medium: 300_000,
  Hard: 420_000,
};

export const BASE_POINTS: Record<Difficulty, number> = {
  Easy: 100,
  Medium: 150,
  Hard: 200,
};

export const BOSS_SELF_MARK_POINTS = {
  incorrect: 0,
  partial: 50,
  correct: 100,
} as const;

export type BossSelfMark = keyof typeof BOSS_SELF_MARK_POINTS;

export const BOSS_TIME_BONUS_XP = 25;
export const BOSS_TIME_BONUS_THRESHOLD = 0.75;

export const COMBO_INCREMENT = 0.1;
export const COMBO_MAX = 2.0;
export const COMBO_CORRECTS_FOR_MAX = 10;

export const TIMER_GRACE_MS = 500;

export const XP_LEVEL_THRESHOLDS = [0, 300, 700, 1500, 3000, 5500, 9000, 14000, 21000];

export const PLAY_CATEGORY_LABELS: Record<PlayCategory, string> = {
  HSC: "HSC Mathematics",
  IB: "IB Mathematics",
  "A-Level": "A-Level Mathematics",
};
