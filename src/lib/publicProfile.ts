import { unstable_cache } from "next/cache";
import { computeAchievements } from "@/lib/achievementStats";
import { countryByCode } from "@/lib/profile/constants";
import { getDashboardLeaderboardStats } from "@/lib/dashboardStats";
import { getUserSprintAchievements } from "@/lib/sprintAchievements";
import { dayKeysFromAttempts, longestStreakFromDayKeys } from "@/lib/achievementStats";
import { localDayKey } from "@/lib/progressStats";
import { getQuestionSummaries } from "@/lib/questions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/server";
import { isValidUsername, normalizeUsername } from "@/lib/profile/username";
import type { CompetitionStats } from "@/components/dashboard/SolvedStatsCard";
import type { AchievementProgress, UserProfile } from "@/types/profile";
import type { ActivityDay } from "@/lib/progressStats";
import type { Difficulty } from "@/types/question";

export interface PublicRecentItem {
  id: string;
  type: "solved" | "achievement";
  label: string;
  timestamp: string;
}

export interface PublicProfilePayload {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
  countryCode: string | null;
  school: string | null;
  grade: string | null;
  memberSince: string;
  globalRank: number | null;
  totalRankedUsers: number;
  topPercent: number | null;
  countryRank: number | null;
  sprintRank: number | null;
  solved: number;
  attempting: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  solvedThisYear: number;
  xp: number;
  badgesEarned: number;
  bestSprint: number;
  byDifficulty: Record<Difficulty, { solved: number; total: number }>;
  byCompetition: CompetitionStats[];
  activity: ActivityDay[];
  achievements: AchievementProgress[];
  recentActivity: PublicRecentItem[];
  showCountry: boolean;
  showSchool: boolean;
  showActivity: boolean;
  showLeaderboardRank: boolean;
}

type AttemptRow = {
  question_id: string;
  status: string;
  solved_at: string | null;
  attempt_count: number;
};

const COMPETITION_GROUPS = [
  { key: "AMC 10", match: (c: string) => c === "AMC10" },
  { key: "AMC 12", match: (c: string) => c === "AMC12" },
  {
    key: "Other",
    match: (c: string) => c !== "AMC10" && c !== "AMC12",
  },
] as const;

function currentStreakFromDayKeys(dayKeys: string[]): number {
  const active = new Set(dayKeys);
  let count = 0;
  const cursor = new Date();
  const fmt = (d: Date) => localDayKey(d);
  if (!active.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (active.has(fmt(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function estimateUnlockedAt(
  achievement: AchievementProgress,
  solvedDates: string[],
  bestSprintDate: string | null
): string | undefined {
  if (!achievement.unlocked) return undefined;
  if (achievement.category === "solved" && solvedDates.length >= achievement.target) {
    return solvedDates[achievement.target - 1];
  }
  if (achievement.category === "speed" && bestSprintDate) return bestSprintDate;
  if (achievement.category === "streak") return solvedDates[solvedDates.length - 1];
  return solvedDates[solvedDates.length - 1];
}

async function findUserRowByUsername(
  normalized: string
): Promise<{
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
} | null> {
  const supabase = createAnonClient();

  const { data: byDisplayName } = await supabase
    .from("users")
    .select("id, display_name, avatar_url, created_at")
    .ilike("display_name", normalized)
    .maybeSingle();
  if (byDisplayName) return byDisplayName;

  const admin = createAdminClient();
  if (!admin) return null;

  for (let page = 1; page <= 10; page++) {
    const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = list?.users ?? [];
    if (users.length === 0) break;

    const hit = users.find((u) => {
      const metaUsername = (u.user_metadata?.username as string | undefined)?.toLowerCase();
      const profileUsername = (
        u.user_metadata?.profile as UserProfile | undefined
      )?.username?.toLowerCase();
      return metaUsername === normalized || profileUsername === normalized;
    });

    if (hit) {
      const { data: row } = await supabase
        .from("users")
        .select("id, display_name, avatar_url, created_at")
        .eq("id", hit.id)
        .maybeSingle();
      if (row) return row;
    }
  }

  return null;
}

function rankAmong(peers: { id: string; score: number }[], userId: string): number | null {
  if (peers.length === 0) return null;
  const sorted = [...peers].sort((a, b) => b.score - a.score);
  const idx = sorted.findIndex((p) => p.id === userId);
  return idx >= 0 ? idx + 1 : null;
}

export async function resolvePublicUserLabels(
  userIds: string[]
): Promise<Map<string, { displayLabel: string; profileSlug: string | null; avatarUrl: string | null }>> {
  const result = new Map<
    string,
    { displayLabel: string; profileSlug: string | null; avatarUrl: string | null }
  >();
  if (userIds.length === 0) return result;

  const supabase = createAnonClient();
  const admin = createAdminClient();
  const { data: rows } = await supabase
    .from("users")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  for (const id of userIds) {
    const row = rows?.find((r) => r.id === id);
    let displayLabel = row?.display_name ?? "anonymous";
    let profileSlug: string | null = null;
    let avatarUrl: string | null = row?.avatar_url ?? null;

    if (row?.display_name && isValidUsername(row.display_name)) {
      profileSlug = normalizeUsername(row.display_name);
      displayLabel = row.display_name;
    }

    if (admin) {
      const { data: authData } = await admin.auth.admin.getUserById(id);
      const meta = authData.user?.user_metadata ?? {};
      const profile = meta.profile as UserProfile | undefined;
      const metaUsername =
        (meta.username as string | undefined) || profile?.username || undefined;
      if (metaUsername && isValidUsername(metaUsername)) {
        profileSlug = normalizeUsername(metaUsername);
        displayLabel = metaUsername;
      } else if (profile?.displayName?.trim()) {
        displayLabel = profile.displayName.trim();
      }
      const metaAvatar =
        (typeof meta.avatar_url === "string" && meta.avatar_url) ||
        (typeof meta.picture === "string" && meta.picture) ||
        null;
      if (metaAvatar) avatarUrl = metaAvatar;
    }

    result.set(id, { displayLabel, profileSlug, avatarUrl });
  }

  return result;
}

async function loadPublicProfile(
  username: string
): Promise<PublicProfilePayload | "not_found" | "private"> {
  const normalized = normalizeUsername(username);
  if (!normalized || !isValidUsername(normalized)) return "not_found";

  const userRow = await findUserRowByUsername(normalized);
  if (!userRow) return "not_found";

  const admin = createAdminClient();
  let profileMeta: Partial<UserProfile> = {};
  let avatarUrl: string | null = userRow.avatar_url;
  if (admin) {
    const { data: authData } = await admin.auth.admin.getUserById(userRow.id);
    profileMeta = (authData.user?.user_metadata?.profile as Partial<UserProfile>) ?? {};
    const visibility = profileMeta.privacy?.visibility ?? "public";
    if (visibility === "private") return "private";
    const meta = authData.user?.user_metadata ?? {};
    const metaAvatar =
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null;
    if (metaAvatar) avatarUrl = metaAvatar;
  }

  const privacy = profileMeta.privacy;
  const showCountry = privacy?.showCountry !== false;
  const showSchool = privacy?.showSchool !== false;
  const showActivity = privacy?.showActivity !== false;
  const showLeaderboardRank = privacy?.showLeaderboardRank !== false;

  const supabase = createAnonClient();

  const [questions, { data: attempts }, leaderboardStats, { data: allSolved }] =
    await Promise.all([
      getQuestionSummaries(),
      supabase
        .from("question_attempts")
        .select("question_id, status, solved_at, attempt_count")
        .eq("user_id", userRow.id),
      getDashboardLeaderboardStats(userRow.id),
      supabase.from("question_attempts").select("user_id").eq("status", "solved"),
    ]);

  const attemptRows = (attempts ?? []) as AttemptRow[];
  const solvedIds = new Set(
    attemptRows.filter((a) => a.status === "solved").map((a) => a.question_id)
  );
  const attempting = attemptRows.filter((a) => a.status === "attempted").length;

  const difficultyById = new Map(questions.map((q) => [q.id, q.difficulty]));
  const topicById = new Map(questions.map((q) => [q.id, q.topic]));

  const byDifficulty: Record<Difficulty, { solved: number; total: number }> = {
    Easy: { total: 0, solved: 0 },
    Medium: { total: 0, solved: 0 },
    Hard: { total: 0, solved: 0 },
  };
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  for (const q of questions) {
    const bucket = byDifficulty[q.difficulty];
    if (!bucket) continue;
    bucket.total += 1;
    if (solvedIds.has(q.id)) {
      bucket.solved += 1;
      if (q.difficulty === "Easy") easySolved += 1;
      else if (q.difficulty === "Medium") mediumSolved += 1;
      else hardSolved += 1;
    }
  }

  const byCompetition = COMPETITION_GROUPS.map(({ key, match }) => {
    let total = 0;
    let solved = 0;
    for (const q of questions) {
      if (!q.competition || !match(q.competition)) continue;
      total += 1;
      if (solvedIds.has(q.id)) solved += 1;
    }
    return {
      key,
      total,
      solved,
      percent: total > 0 ? Math.round((solved / total) * 100) : 0,
    };
  });

  const dayKeys = dayKeysFromAttempts(attemptRows);
  const longestStreak = longestStreakFromDayKeys(dayKeys);
  const currentStreak = currentStreakFromDayKeys(dayKeys);
  const activeDays = new Set(dayKeys).size;

  const solvedDates = attemptRows
    .filter((a) => a.status === "solved" && a.solved_at)
    .map((a) => a.solved_at as string)
    .sort();

  type DayBucket = { count: number; Easy: number; Medium: number; Hard: number };
  const buckets: Record<string, DayBucket> = {};
  for (const a of attemptRows) {
    if (a.status !== "solved" || !a.solved_at) continue;
    const key = localDayKey(new Date(a.solved_at));
    if (!buckets[key]) buckets[key] = { count: 0, Easy: 0, Medium: 0, Hard: 0 };
    buckets[key].count += 1;
    const diff = difficultyById.get(a.question_id);
    if (diff === "Easy" || diff === "Medium" || diff === "Hard") buckets[key][diff] += 1;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const activity: ActivityDay[] = [];
  let solvedThisYear = 0;
  const cursor = new Date(yearStart);
  while (cursor <= today) {
    const key = localDayKey(cursor);
    const bucket = buckets[key];
    const count = bucket?.count ?? 0;
    solvedThisYear += count;
    activity.push({
      date: key,
      count,
      byDifficulty: bucket
        ? { Easy: bucket.Easy, Medium: bucket.Medium, Hard: bucket.Hard }
        : undefined,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const solved = solvedIds.size;
  const acceptanceRate =
    solved + attempting > 0 ? Math.round((solved / (solved + attempting)) * 100) : 0;
  const bestSprint = leaderboardStats?.bestSprintScore ?? 0;
  const xp = solved * 10 + bestSprint;

  const sprintUnlocked = admin
    ? await getUserSprintAchievements(admin, userRow.id)
    : new Set<string>();

  const achievementInputs = {
    solved,
    longestStreak,
    rank: leaderboardStats?.solvedRank ?? null,
    bestSprint,
    totalRankedUsers: leaderboardStats?.totalRankedUsers ?? 0,
    sprintUnlocked,
  };

  const { data: bestSprintRow } = await supabase
    .from("sprint_sessions")
    .select("ended_at")
    .eq("user_id", userRow.id)
    .eq("is_complete", true)
    .order("score", { ascending: false })
    .limit(1);

  const bestSprintDate = bestSprintRow?.[0]?.ended_at ?? null;

  const achievements = computeAchievements(achievementInputs)
    .filter((a) => a.unlocked)
    .map((a) => ({
      ...a,
      unlockedAt: estimateUnlockedAt(a, solvedDates, bestSprintDate),
    }));

  const badgesEarned = achievements.length;

  const globalRank = showLeaderboardRank ? (leaderboardStats?.solvedRank ?? null) : null;
  const totalRankedUsers = leaderboardStats?.totalRankedUsers ?? 0;
  const topPercent =
    globalRank != null && totalRankedUsers > 0
      ? Math.max(1, Math.round((globalRank / totalRankedUsers) * 100))
      : null;

  const countsByUser = new Map<string, number>();
  for (const row of allSolved ?? []) {
    countsByUser.set(row.user_id, (countsByUser.get(row.user_id) ?? 0) + 1);
  }

  let countryRank: number | null = null;
  const sprintRank = showLeaderboardRank ? (leaderboardStats?.sprintRank ?? null) : null;
  const targetCountry = profileMeta.countryCode;

  if (admin && showLeaderboardRank && targetCountry) {
    const metaByUser = new Map<string, Partial<UserProfile>>();
    metaByUser.set(userRow.id, profileMeta);
    const peerIds = [...countsByUser.keys()].filter((id) => id !== userRow.id).slice(0, 200);
    await Promise.all(
      peerIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        metaByUser.set(id, (data.user?.user_metadata?.profile as Partial<UserProfile>) ?? {});
      })
    );

    if (showCountry) {
      const peers = [...countsByUser.entries()]
        .filter(([id, score]) => {
          const m = metaByUser.get(id);
          return m?.countryCode === targetCountry && score > 0;
        })
        .map(([id, score]) => ({ id, score }));
      countryRank = rankAmong(peers, userRow.id);
    }
  }

  const recentSolves: PublicRecentItem[] = attemptRows
    .filter((a) => a.status === "solved" && a.solved_at)
    .sort((a, b) => new Date(b.solved_at!).getTime() - new Date(a.solved_at!).getTime())
    .slice(0, 10)
    .map((a) => ({
      id: `solve-${a.question_id}`,
      type: "solved" as const,
      label: `Solved "${topicById.get(a.question_id) ?? a.question_id}"`,
      timestamp: a.solved_at!,
    }));

  const recentAchievements: PublicRecentItem[] = achievements
    .filter((a) => a.unlockedAt)
    .map((a) => ({
      id: `badge-${a.id}`,
      type: "achievement" as const,
      label: `Unlocked ${a.title}`,
      timestamp: a.unlockedAt!,
    }));

  const recentActivity = [...recentSolves, ...recentAchievements]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const country =
    profileMeta.country || (targetCountry ? countryByCode(targetCountry)?.name : null) || null;

  const canonicalUsername =
    (profileMeta.username && isValidUsername(profileMeta.username)
      ? profileMeta.username
      : null) ??
    (userRow.display_name && isValidUsername(userRow.display_name) ? userRow.display_name : null) ??
    normalized;

  return {
    userId: userRow.id,
    username: canonicalUsername,
    displayName: profileMeta.displayName?.trim() || null,
    avatarUrl,
    country: showCountry ? country : null,
    countryCode: showCountry ? targetCountry || null : null,
    school: showSchool ? profileMeta.school || null : null,
    grade: profileMeta.grade || null,
    memberSince: userRow.created_at,
    globalRank,
    totalRankedUsers,
    topPercent,
    countryRank,
    sprintRank,
    solved,
    attempting,
    easySolved,
    mediumSolved,
    hardSolved,
    acceptanceRate,
    currentStreak,
    longestStreak,
    activeDays,
    solvedThisYear,
    xp,
    badgesEarned,
    bestSprint,
    byDifficulty,
    byCompetition,
    activity: showActivity ? activity : [],
    achievements,
    recentActivity: showActivity ? recentActivity : [],
    showCountry,
    showSchool,
    showActivity,
    showLeaderboardRank,
  };
}

/** Public profiles of other users — ~60s cache. */
export async function getPublicProfile(
  username: string
): Promise<PublicProfilePayload | "not_found" | "private"> {
  const normalized = normalizeUsername(username);
  if (!normalized || !isValidUsername(normalized)) return "not_found";
  return unstable_cache(
    () => loadPublicProfile(normalized),
    ["public-profile-v1", normalized],
    { revalidate: 60 }
  )();
}
