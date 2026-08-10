import { DashboardClient } from "./DashboardClient";
import { getDashboardLeaderboardStats } from "@/lib/dashboardStats";
import { getQuestionSummaries } from "@/lib/questions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Summaries only — dashboard needs id/difficulty/competition, not solutions/choices.
  const questions = await getQuestionSummaries();

  let leaderboardStats = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    leaderboardStats = await getDashboardLeaderboardStats(user?.id ?? null);
  }

  return (
    <DashboardClient
      questions={questions}
      leaderboardStats={leaderboardStats}
      fromProfile={params.from === "profile"}
    />
  );
}
