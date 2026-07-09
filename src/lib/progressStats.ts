import { getSolvedMap } from "@/lib/progress";
import { getGameProfile } from "@/lib/gameProfile";
import type { Difficulty } from "@/types/question";

export interface ActivityDayBreakdown {
  Easy: number;
  Medium: number;
  Hard: number;
}

export interface ActivityDay {
  date: string;
  count: number;
  byDifficulty?: ActivityDayBreakdown;
}

/** Local calendar date key (YYYY-MM-DD) — avoids UTC shift from toISOString(). */
export function localDayKey(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getActivityByDay(): ActivityDay[] {
  const counts: Record<string, number> = {};

  const addDay = (ts: number) => {
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  };

  for (const entry of Object.values(getSolvedMap())) {
    addDay(entry.solvedAt);
  }

  const profile = getGameProfile();
  for (const run of profile.runHistory ?? []) {
    addDay(run.completedAt);
  }

  const result: ActivityDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getFullYear(), 0, 1);
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    result.push({ date: key, count: counts[key] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export interface RecentActivityItem {
  id: string;
  type: "solved" | "run";
  label: string;
  timestamp: number;
  meta?: string;
}

export function getRecentActivity(limit = 15): RecentActivityItem[] {
  const items: RecentActivityItem[] = [];

  for (const [id, entry] of Object.entries(getSolvedMap())) {
    items.push({
      id: `solved-${id}`,
      type: "solved",
      label: `Solved ${id}`,
      timestamp: entry.solvedAt,
      meta: entry.difficulty,
    });
  }

  const profile = getGameProfile();
  for (const run of profile.runHistory ?? []) {
    items.push({
      id: run.id,
      type: "run",
      label: `${run.category} challenge`,
      timestamp: run.completedAt,
      meta: `${run.accuracy}% · +${run.totalXp} pts`,
    });
  }

  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export function getAggregateAccuracy(): number {
  const profile = getGameProfile();
  const runs = profile.runHistory;
  if (runs.length === 0) return 0;
  const sum = runs.reduce((s, r) => s + r.accuracy, 0);
  return Math.round(sum / runs.length);
}

export function getMaxStreak(): number {
  const profile = getGameProfile();
  return Math.max(0, ...Object.values(profile.categories).map((c) => c.streakDays));
}

export function getSolvedByDifficulty(): Record<Difficulty, number> {
  const map = getSolvedMap();
  const result: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const entry of Object.values(map)) {
    result[entry.difficulty] += 1;
  }
  return result;
}
