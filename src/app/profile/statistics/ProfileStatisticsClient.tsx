"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useProfile } from "@/lib/profile/useProfile";
import { useProgress } from "@/lib/useProgress";
import { ProfileLayout } from "@/components/profile/ProfileNav";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { useProfileStatsFromAttempts } from "@/components/profile/ProfileHeader";
import { localDayKey } from "@/lib/progressStats";
import { ProfilePageSkeleton } from "@/components/PageLoading";

export default function ProfileStatisticsClient() {
  const router = useRouter();
  const { loading, signedIn, profile } = useProfile();
  const { solvedIds, attempts } = useProgress();

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  const activity = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const a of attempts.filter((x) => x.status === "solved" && x.solved_at)) {
      const key = localDayKey(new Date(a.solved_at as string));
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  }, [attempts]);

  const baseStats = useProfileStatsFromAttempts(solvedIds.size, activity);
  const stats = { ...baseStats, solved: solvedIds.size };

  if (loading) {
    return <ProfilePageSkeleton label="Loading statistics…" />;
  }

  return (
    <ProfileLayout>
      <ProfileCard title="Statistics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Total Solved" value={stats.solved} />
          <Stat label="Active Days" value={activity.filter((d) => d.count > 0).length} />
          <Stat label="Current Streak" value={`${stats.currentStreak} days`} />
          <Stat label="Longest Streak" value={`${stats.longestStreak} days`} />
          <Stat label="Difficulty Pref." value={profile?.difficultyPreference ?? "—"} />
          <Stat label="Topics Selected" value={profile?.topics.length ?? 0} />
        </div>
      </ProfileCard>
    </ProfileLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
