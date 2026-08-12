"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useProfile } from "@/lib/profile/useProfile";
import { ProfileLayout } from "@/components/profile/ProfileNav";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { AchievementGrid } from "@/components/profile/AchievementGrid";
import { useAchievementStats } from "@/lib/profile/useAchievementStats";
import { ProfilePageSkeleton } from "@/components/PageLoading";

export default function ProfileAchievementsClient() {
  const router = useRouter();
  const { loading, signedIn } = useProfile();
  const { items, earned, total } = useAchievementStats();

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  if (loading) {
    return <ProfilePageSkeleton label="Loading achievements…" />;
  }

  return (
    <ProfileLayout>
      <ProfileCard title={`Achievements (${earned}/${total})`}>
        <AchievementGrid items={items} />
      </ProfileCard>
    </ProfileLayout>
  );
}
