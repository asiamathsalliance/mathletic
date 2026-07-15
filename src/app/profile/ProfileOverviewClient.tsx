"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/lib/profile/useProfile";
import { useProgress } from "@/lib/useProgress";
import { ProfileLayout } from "@/components/profile/ProfileNav";
import { ProfileHeader, useProfileStatsFromAttempts } from "@/components/profile/ProfileHeader";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { AchievementGrid } from "@/components/profile/AchievementGrid";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { localDayKey } from "@/lib/progressStats";
import { useAchievementStats } from "@/lib/profile/useAchievementStats";

export function ProfileOverviewClient() {
  const router = useRouter();
  const { loading, signedIn, profile, email, memberSince, avatarUrl } = useProfile();
  const { solvedIds, attempts } = useProgress();

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/");
    if (!loading && profile && !profile.onboardingComplete) router.replace("/welcome");
  }, [loading, signedIn, profile, router]);

  const activity = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const a of attempts.filter((x) => x.status === "solved" && x.solved_at)) {
      const key = localDayKey(new Date(a.solved_at as string));
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    const result: { date: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const cursor = new Date(yearStart);
    while (cursor <= today) {
      const key = localDayKey(cursor);
      result.push({ date: key, count: buckets[key] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [attempts]);

  const baseStats = useProfileStatsFromAttempts(solvedIds.size, activity);
  const { earned: achievementsEarned, items: achievements } = useAchievementStats();
  const stats = { ...baseStats, solved: solvedIds.size, achievementsEarned };

  if (loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const recentAchievements = achievements.filter((a) => a.unlocked).reverse().slice(0, 2);

  return (
    <ProfileLayout>
      <div className="space-y-8">
        <ProfileHeader
          profile={profile}
          email={email}
          memberSince={memberSince}
          avatarUrl={avatarUrl}
          stats={stats}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <ProfileCard title="Recent Achievements">
            {recentAchievements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Start solving to earn badges!</p>
            ) : (
              <ul className="space-y-3">
                {recentAchievements.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="text-2xl">{a.icon}</span>
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-muted-foreground">{a.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/profile/achievements"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </ProfileCard>

          <ProfileCard title="Favorite Topics">
            {profile.topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Set topics in{" "}
                <Link href="/settings?from=profile" className="text-primary hover:underline">
                  Settings
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.topics.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-accent px-3 py-1 text-sm font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Current streak: <strong>{stats.currentStreak} days</strong>
            </p>
          </ProfileCard>
        </div>

        <ProfileCard title="Activity">
          <ActivityHeatmap data={activity} />
        </ProfileCard>
      </div>
    </ProfileLayout>
  );
}
