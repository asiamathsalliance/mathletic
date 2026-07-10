import type { SupabaseClient } from "@supabase/supabase-js";
import type { SprintModeType } from "@/lib/sprint";

export interface SprintAchievement {
  key: string;
  title: string;
  description: string | null;
}

export interface SessionSummary {
  modeType: SprintModeType;
  problemsSolved: number;
  attemptsCount: number;
  bestStreak: number;
}

/**
 * Check unlock conditions and insert new user_achievements rows.
 * Returns only newly awarded achievements this finish.
 */
export async function checkAndAwardAchievements(
  supabase: SupabaseClient,
  userId: string,
  session: SessionSummary
): Promise<SprintAchievement[]> {
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_key")
    .eq("user_id", userId);
  const unlocked = new Set((existing ?? []).map((r) => r.achievement_key));

  const toAward: string[] = [];

  // first_sprint — any completed session
  if (!unlocked.has("first_sprint")) {
    toAward.push("first_sprint");
  }

  if (session.modeType === "MULTIPLICATION") {
    if (!unlocked.has("streak_10") && session.bestStreak >= 10) {
      toAward.push("streak_10");
    }
    if (!unlocked.has("speed_demon") && session.problemsSolved >= 30) {
      toAward.push("speed_demon");
    }
    if (!unlocked.has("century_multiplication")) {
      const { data: multSessions } = await supabase
        .from("sprint_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("mode_type", "MULTIPLICATION");
      const sessionIds = (multSessions ?? []).map((s) => s.id);
      if (sessionIds.length > 0) {
        const { count } = await supabase
          .from("sprint_attempts")
          .select("id", { count: "exact", head: true })
          .eq("correct", true)
          .not("operand_a", "is", null)
          .in("session_id", sessionIds);
        if ((count ?? 0) >= 100) {
          toAward.push("century_multiplication");
        }
      }
    }
  }

  if (session.modeType === "PROBLEM_POOL") {
    if (!unlocked.has("easy_grinder") && session.problemsSolved >= 15) {
      toAward.push("easy_grinder");
    }
    if (
      !unlocked.has("sharp_shooter") &&
      session.attemptsCount >= 10 &&
      session.problemsSolved === session.attemptsCount
    ) {
      toAward.push("sharp_shooter");
    }
  }

  if (toAward.length === 0) return [];

  const rows = toAward.map((key) => ({
    user_id: userId,
    achievement_key: key,
  }));
  await supabase.from("user_achievements").upsert(rows, {
    onConflict: "user_id,achievement_key",
    ignoreDuplicates: true,
  });

  const { data: defs } = await supabase
    .from("achievements")
    .select("key, title, description")
    .in("key", toAward);

  return (defs ?? []) as SprintAchievement[];
}

/** Fetch all unlocked sprint achievements for a user. */
export async function getUserSprintAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.achievement_key));
}
