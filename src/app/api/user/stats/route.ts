import { NextResponse } from "next/server";
import { getDashboardLeaderboardStats } from "@/lib/dashboardStats";
import { getUserSprintAchievements } from "@/lib/sprintAchievements";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ solvedRank: null, bestSprintScore: 0 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ solvedRank: null, bestSprintScore: 0 });
  }

  const stats = await getDashboardLeaderboardStats(user.id);
  const sprintUnlocked = await getUserSprintAchievements(supabase, user.id);
  return NextResponse.json({
    rank: stats?.solvedRank ?? null,
    bestSprint: stats?.bestSprintScore ?? 0,
    totalRankedUsers: stats?.totalRankedUsers ?? 0,
    solvedRank: stats?.solvedRank ?? null,
    bestSprintScore: stats?.bestSprintScore ?? 0,
    sprintUnlocked: [...sprintUnlocked],
  });
}
