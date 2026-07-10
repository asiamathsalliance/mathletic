import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  parseLeaderboardParams,
  valueLabelFor,
  type LeaderboardSearchParams,
} from "@/lib/leaderboard";
import { LeaderboardHeader } from "@/components/leaderboard/LeaderboardHeader";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { LeaderboardTableHead } from "@/components/leaderboard/LeaderboardTableHead";
import { LeaderboardSkeletonRows } from "@/components/leaderboard/LeaderboardSkeletonRows";
import { LeaderboardRows } from "@/components/leaderboard/LeaderboardRows";

export const metadata = {
  title: "Leaderboard | Mathletic",
};

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<LeaderboardSearchParams>;
}

function LeaderboardUnavailable() {
  return (
    <div className="space-y-6">
      <LeaderboardHeader />
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Leaderboards need the Supabase backend. Add your Supabase keys to{" "}
        <code>.env.local</code> (see the README) and restart the dev server.
      </div>
    </div>
  );
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const params = parseLeaderboardParams(await searchParams);

  if (!isSupabaseConfigured()) {
    return <LeaderboardUnavailable />;
  }

  const suspenseKey = `${params.board}-${params.window}-${params.mode}-${params.topic}`;

  return (
    <div className="space-y-6">
      <LeaderboardHeader />
      <LeaderboardTabs params={params} />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <LeaderboardTableHead board={params.board} valueLabel={valueLabelFor(params)} />
        <Suspense
          key={suspenseKey}
          fallback={<LeaderboardSkeletonRows board={params.board} count={8} />}
        >
          <LeaderboardRows params={params} />
        </Suspense>
      </div>
    </div>
  );
}
