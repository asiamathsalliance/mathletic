import { ACHIEVEMENTS } from "@/lib/profile/constants";
import { localDayKey } from "@/lib/progressStats";
import type { AchievementProgress } from "@/types/profile";

export interface AchievementInputs {
  solved: number;
  longestStreak: number;
  rank: number | null;
  bestSprint: number;
  /** Users on the solved leaderboard — required for rank-based badges. */
  totalRankedUsers?: number;
}

export function computeAchievements(stats: AchievementInputs): AchievementProgress[] {
  return ACHIEVEMENTS.map((a) => {
    let progress = 0;
    if (a.category === "solved") progress = stats.solved;
    else if (a.category === "streak") progress = stats.longestStreak;
    else if (a.category === "speed") progress = stats.bestSprint;
    else if (a.category === "leaderboard") progress = stats.rank ? stats.rank : 999;
    else if (a.category === "topic") progress = 0;

    let unlocked = false;
    if (a.category === "leaderboard") {
      const competitors = stats.totalRankedUsers ?? 0;
      const minCompetitors = a.target === 1 ? 2 : 10;
      unlocked =
        stats.rank !== null &&
        stats.rank <= a.target &&
        competitors >= minCompetitors;
    } else if (a.category === "topic") {
      unlocked = false;
    } else {
      unlocked = progress >= a.target;
    }

    return { ...a, progress, unlocked };
  });
}

/** Longest consecutive-day solving streak from ISO date keys (YYYY-MM-DD). */
export function longestStreakFromDayKeys(dayKeys: string[]): number {
  const sorted = [...new Set(dayKeys)].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;

  for (const date of sorted) {
    if (prev) {
      const [py, pm, pd] = prev.split("-").map(Number);
      const [cy, cm, cd] = date.split("-").map(Number);
      const diff =
        (new Date(cy, cm - 1, cd).getTime() - new Date(py, pm - 1, pd).getTime()) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = date;
  }

  return longest;
}

export function dayKeysFromAttempts(
  attempts: { status: string; solved_at?: string | null }[]
): string[] {
  return attempts
    .filter((a) => a.status === "solved" && a.solved_at)
    .map((a) => localDayKey(new Date(a.solved_at as string)));
}

export function countUnlockedAchievements(inputs: AchievementInputs): number {
  return computeAchievements(inputs).filter((a) => a.unlocked).length;
}

export function achievementSummary(inputs: AchievementInputs) {
  const items = computeAchievements(inputs);
  const earned = items.filter((a) => a.unlocked).length;
  return { items, earned, total: ACHIEVEMENTS.length };
}
