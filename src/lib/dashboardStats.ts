import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface DashboardLeaderboardStats {
  bestSprintScore: number;
  sprintRuns: number;
  bestSprintAccuracy: number | null;
  bestSprintCorrect: number;
  bestSprintAnswered: number;
  bestMultiplicationSolved: number;
  bestProblemPoolSolved: number;
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
        .select("score, problems_solved, attempts_count, mode_type")
        .eq("user_id", userId)
        .eq("is_complete", true)
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
        .eq("is_complete", true),
    ]);

  const runs = sprints ?? [];
  const best = runs[0];
  const bestAccuracy =
    best && best.attempts_count > 0
      ? Math.round((best.problems_solved / best.attempts_count) * 100)
      : null;

  const multRuns = runs.filter((r) => r.mode_type === "MULTIPLICATION");
  const problemRuns = runs.filter((r) => r.mode_type === "PROBLEM_POOL");
  const bestMult = multRuns.sort((a, b) => b.problems_solved - a.problems_solved)[0];
  const bestProblem = problemRuns.sort((a, b) => b.problems_solved - a.problems_solved)[0];

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
    bestSprintCorrect: best?.problems_solved ?? 0,
    bestSprintAnswered: best?.attempts_count ?? 0,
    bestMultiplicationSolved: bestMult?.problems_solved ?? 0,
    bestProblemPoolSolved: bestProblem?.problems_solved ?? 0,
    solvedRank: countsByUser.size > 0 ? betterSolved + 1 : null,
    sprintRank: bestSprintByUser.size > 0 && myBestSprint > 0 ? betterSprint + 1 : null,
    totalRankedUsers: countsByUser.size,
  };
}
