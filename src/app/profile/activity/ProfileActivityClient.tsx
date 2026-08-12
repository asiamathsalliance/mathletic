"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useProfile } from "@/lib/profile/useProfile";
import { useProgress } from "@/lib/useProgress";
import { ProfileLayout } from "@/components/profile/ProfileNav";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { localDayKey } from "@/lib/progressStats";
import { ProfilePageSkeleton } from "@/components/PageLoading";

export default function ProfileActivityClient() {
  const router = useRouter();
  const { loading, signedIn } = useProfile();
  const { attempts } = useProgress();

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  const activity = useMemo(() => {
    const buckets: Record<string, { count: number; Easy: number; Medium: number; Hard: number }> = {};
    for (const a of attempts.filter((x) => x.status === "solved" && x.solved_at)) {
      const key = localDayKey(new Date(a.solved_at as string));
      if (!buckets[key]) buckets[key] = { count: 0, Easy: 0, Medium: 0, Hard: 0 };
      buckets[key].count += 1;
    }
    const result: {
      date: string;
      count: number;
      byDifficulty?: { Easy: number; Medium: number; Hard: number };
    }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const cursor = new Date(yearStart);
    while (cursor <= today) {
      const key = localDayKey(cursor);
      const b = buckets[key];
      result.push({
        date: key,
        count: b?.count ?? 0,
        byDifficulty: b ? { Easy: b.Easy, Medium: b.Medium, Hard: b.Hard } : undefined,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [attempts]);

  if (loading) {
    return <ProfilePageSkeleton label="Loading activity…" />;
  }

  return (
    <ProfileLayout>
      <ActivityHeatmap data={activity} />
    </ProfileLayout>
  );
}
