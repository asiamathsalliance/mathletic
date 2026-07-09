"use client";

import Link from "next/link";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { SolvedStatsCard } from "@/components/dashboard/SolvedStatsCard";
import { PublicAchievements } from "@/components/public/PublicAchievements";
import { PublicProfileHeader } from "@/components/public/PublicProfileHeader";
import { ACHIEVEMENTS } from "@/lib/profile/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicProfilePayload } from "@/lib/publicProfile";

export function PublicProfileClient({
  profile,
  isViewer,
}: {
  profile: PublicProfilePayload;
  isViewer: boolean;
}) {
  const total =
    profile.byDifficulty.Easy.total +
    profile.byDifficulty.Medium.total +
    profile.byDifficulty.Hard.total;

  const progressPercent =
    total > 0 ? Math.round((profile.solved / total) * 100) : null;
  const streakLabel =
    profile.currentStreak === 1 ? "1 day" : `${profile.currentStreak} days`;

  const visibleAchievements = [...profile.achievements]
    .sort((a, b) => {
      const ta = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const tb = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, isViewer ? profile.achievements.length : 3);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-0 sm:space-y-10">
      <PublicProfileHeader profile={profile} isViewer={isViewer} />

      <div className="public-profile-rise public-profile-rise-delay-1 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Solved" value={`${profile.solved}/${total}`} />
        <StatCard
          label="Progress"
          value={progressPercent != null ? `${progressPercent}%` : "—"}
        />
        <StatCard label="Streak" value={streakLabel} />
        <StatCard
          label="Achievements"
          value={`${profile.badgesEarned}/${ACHIEVEMENTS.length}`}
        />
      </div>

      <div className="public-profile-rise public-profile-rise-delay-2">
        <SolvedStatsCard
          solvedTotal={profile.solved}
          total={total}
          attempting={profile.attempting}
          byDifficulty={profile.byDifficulty}
          byCompetition={profile.byCompetition}
        />
      </div>

      {profile.showActivity ? (
        <div className="public-profile-rise public-profile-rise-delay-3 min-w-0">
          <ActivityHeatmap data={profile.activity} title="Activity" />
        </div>
      ) : (
        <div className="public-profile-rise public-profile-rise-delay-2 rounded-[24px] border border-border/60 bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-[0_8px_28px_rgba(34,52,26,0.05)]">
          Activity is hidden on this profile.
        </div>
      )}

      <div
        className={`public-profile-rise public-profile-rise-delay-4 grid gap-6${profile.showLeaderboardRank ? " lg:grid-cols-2" : ""}`}
      >
        <PublicAchievements
          items={visibleAchievements}
          total={profile.badgesEarned}
          limited={!isViewer && profile.badgesEarned > 3}
        />

        {profile.showLeaderboardRank && (
          <Card className="h-full border-2 border-border">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-section-header">Leaderboard</CardTitle>
              <Link
                href="/leaderboard"
                className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                Full leaderboard →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <LeaderStat
                  label="Current Rank"
                  value={profile.globalRank != null ? `#${profile.globalRank}` : "—"}
                />
                <LeaderStat
                  label="Top %"
                  value={profile.topPercent != null ? `Top ${profile.topPercent}%` : "—"}
                />
                <LeaderStat
                  label="Country Rank"
                  value={profile.countryRank != null ? `#${profile.countryRank}` : "—"}
                />
                <LeaderStat
                  label="Sprint Rank"
                  value={profile.sprintRank != null ? `#${profile.sprintRank}` : "—"}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 border-2 border-border py-4">
      <CardContent className="pt-1.5 pb-1">
        <p className="text-meta leading-none">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function LeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
