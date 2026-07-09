import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface DashboardLeaderboardStats {
  bestSprintScore: number;
  sprintRuns: number;
  bestSprintAccuracy: number | null;
  bestSprintCorrect: number;
  bestSprintAnswered: number;
  solvedRank: number | null;
  sprintRank: number | null;
  totalRankedUsers: number;
}

export async function getDashboardLeaderboardStats(
  userId: string | null
): Promise<DashboardLeaderboardStats | null> {
  if (!userId || !isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const [{ data: sprints }, { data: myAttempts }, { data: allSolved }, { data: allSprints }] =
    await Promise.all([
      supabase
        .from("sprint_sessions")
        .select("score, questions_correct, questions_answered")
        .eq("user_id", userId)
        .not("finished_at", "is", null)
        .order("score", { ascending: false }),
      supabase
        .from("question_attempts")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "solved"),
      supabase.from("question_attempts").select("user_id").eq("status", "solved"),
      supabase
        .from("sprint_sessions")
        .select("user_id, score")
        .not("finished_at", "is", null),
    ]);

  const runs = sprints ?? [];
  const best = runs[0];
  const bestAccuracy =
    best && best.questions_answered > 0
      ? Math.round((best.questions_correct / best.questions_answered) * 100)
      : null;

  const mySolved = myAttempts?.length ?? 0;
  const countsByUser = new Map<string, number>();
  for (const row of allSolved ?? []) {
    countsByUser.set(row.user_id, (countsByUser.get(row.user_id) ?? 0) + 1);
  }
  const betterSolved = [...countsByUser.values()].filter((c) => c > mySolved).length;

  const bestSprintByUser = new Map<string, number>();
  for (const row of allSprints ?? []) {
    const prev = bestSprintByUser.get(row.user_id) ?? 0;
    if (row.score > prev) bestSprintByUser.set(row.user_id, row.score);
  }
  const myBestSprint = best?.score ?? 0;
  const betterSprint = [...bestSprintByUser.values()].filter((s) => s > myBestSprint).length;

  return {
    bestSprintScore: myBestSprint,
    sprintRuns: runs.length,
    bestSprintAccuracy: bestAccuracy,
    bestSprintCorrect: best?.questions_correct ?? 0,
    bestSprintAnswered: best?.questions_answered ?? 0,
    solvedRank: countsByUser.size > 0 ? betterSolved + 1 : null,
    sprintRank: bestSprintByUser.size > 0 && myBestSprint > 0 ? betterSprint + 1 : null,
    totalRankedUsers: countsByUser.size,
  };
}
