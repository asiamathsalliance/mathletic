"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/lib/profile/useProfile";
import { ProfileLayout } from "@/components/profile/ProfileNav";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { AchievementGrid } from "@/components/profile/AchievementGrid";
import { useAchievementStats } from "@/lib/profile/useAchievementStats";

export default function ProfileAchievementsClient() {
  const router = useRouter();
  const { loading, signedIn } = useProfile();
  const { items, earned, total } = useAchievementStats();

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/");
  }, [loading, signedIn, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ProfileLayout>
      <ProfileCard title={`Achievements (${earned}/${total})`}>
        <AchievementGrid items={items} />
      </ProfileCard>
    </ProfileLayout>
  );
}
