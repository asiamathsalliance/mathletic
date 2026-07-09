import type { PlayCategory } from "@/lib/playConfig";
import { XP_LEVEL_THRESHOLDS } from "@/lib/playConfig";
import { xpToLevel } from "@/lib/gameScoring";

export type BadgeId =
  | "first_run"
  | "combo_5"
  | "combo_10"
  | "perfect_speed_round"
  | "streak_7"
  | "boss_master";

export const BADGE_LABELS: Record<BadgeId, string> = {
  first_run: "First Run",
  combo_5: "Combo x5",
  combo_10: "Combo Master",
  perfect_speed_round: "Speed Demon",
  streak_7: "7-Day Streak",
  boss_master: "Boss Slayer",
};

export interface RunRecord {
  id: string;
  category: PlayCategory;
  totalXp: number;
  maxCombo: number;
  accuracy: number;
  totalTimeMs: number;
  completedAt: number;
}

export interface CategoryProfile {
  xp: number;
  level: number;
  streakDays: number;
  lastPlayedDate: string | null;
  badges: BadgeId[];
}

export interface GameProfile {
  categories: Record<PlayCategory, CategoryProfile>;
  runHistory: RunRecord[];
}

const STORAGE_KEY = "math-exam-prep-game-profile-v1";

function defaultCategoryProfile(): CategoryProfile {
  return { xp: 0, level: 1, streakDays: 0, lastPlayedDate: null, badges: [] };
}

function defaultProfile(): GameProfile {
  return {
    categories: {
      HSC: defaultCategoryProfile(),
      IB: defaultCategoryProfile(),
      "A-Level": defaultCategoryProfile(),
    },
    runHistory: [],
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getGameProfile(): GameProfile {
  if (!isBrowser()) return defaultProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<GameProfile>;
    return {
      ...defaultProfile(),
      ...parsed,
      categories: {
        ...defaultProfile().categories,
        ...parsed.categories,
      },
      runHistory: Array.isArray(parsed.runHistory) ? parsed.runHistory : [],
    };
  } catch {
    return defaultProfile();
  }
}

function saveProfile(profile: GameProfile): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("game-profile-updated"));
  } catch {
    // ignore
  }
}

function updateStreak(cat: CategoryProfile): CategoryProfile {
  const today = todayKey();
  const yesterday = yesterdayKey();
  if (cat.lastPlayedDate === today) return cat;
  if (cat.lastPlayedDate === yesterday) {
    return { ...cat, streakDays: cat.streakDays + 1, lastPlayedDate: today };
  }
  return { ...cat, streakDays: 1, lastPlayedDate: today };
}

function awardBadges(
  cat: CategoryProfile,
  opts: {
    maxCombo: number;
    mcqCorrect: number;
    mcqTotal: number;
    bossCorrect: boolean;
    isFirstRun: boolean;
  }
): BadgeId[] {
  const badges = new Set(cat.badges);
  if (opts.isFirstRun) badges.add("first_run");
  if (opts.maxCombo >= 1.5) badges.add("combo_5");
  if (opts.maxCombo >= 2) badges.add("combo_10");
  if (opts.mcqTotal > 0 && opts.mcqCorrect === opts.mcqTotal) badges.add("perfect_speed_round");
  if (cat.streakDays >= 7) badges.add("streak_7");
  if (opts.bossCorrect) badges.add("boss_master");
  return [...badges];
}

export interface RecordRunInput {
  category: PlayCategory;
  totalXp: number;
  maxCombo: number;
  mcqCorrect: number;
  mcqTotal: number;
  bossCorrect: boolean;
  accuracy: number;
  totalTimeMs: number;
}

export function recordRun(input: RecordRunInput): GameProfile {
  const profile = getGameProfile();
  const cat = profile.categories[input.category];
  const withStreak = updateStreak(cat);
  const newXp = withStreak.xp + input.totalXp;
  const newLevel = xpToLevel(newXp, XP_LEVEL_THRESHOLDS);
  const isFirstRun = profile.runHistory.length === 0;
  const badges = awardBadges(
    { ...withStreak, streakDays: withStreak.streakDays },
    {
      maxCombo: input.maxCombo,
      mcqCorrect: input.mcqCorrect,
      mcqTotal: input.mcqTotal,
      bossCorrect: input.bossCorrect,
      isFirstRun,
    }
  );

  profile.categories[input.category] = {
    ...withStreak,
    xp: newXp,
    level: newLevel,
    badges,
  };

  profile.runHistory.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: input.category,
    totalXp: input.totalXp,
    maxCombo: input.maxCombo,
    accuracy: input.accuracy,
    totalTimeMs: input.totalTimeMs,
    completedAt: Date.now(),
  });

  if (profile.runHistory.length > 50) {
    profile.runHistory = profile.runHistory.slice(0, 50);
  }

  saveProfile(profile);
  return profile;
}

export function getPersonalPercentileBand(category: PlayCategory): string | null {
  const profile = getGameProfile();
  const runs = profile.runHistory.filter((r) => r.category === category);
  if (runs.length < 2) return null;
  const latest = runs[0].totalXp;
  const below = runs.filter((r) => r.totalXp < latest).length;
  const percentile = Math.round((below / (runs.length - 1)) * 100);
  if (percentile >= 75) return "Top 25% of your runs";
  if (percentile >= 50) return "Top 50% of your runs";
  if (percentile >= 25) return "Top 75% of your runs";
  return "Keep practising — beat your average!";
}
