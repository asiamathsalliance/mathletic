"use client";

import { useEffect, useMemo, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import {
  achievementSummary,
  dayKeysFromAttempts,
  longestStreakFromDayKeys,
  type AchievementInputs,
} from "@/lib/achievementStats";

type ExtraStats = Pick<AchievementInputs, "rank" | "bestSprint" | "totalRankedUsers">;
type ApiStats = {
  rank?: number | null;
  bestSprint?: number;
  totalRankedUsers?: number;
  solvedRank?: number | null;
  bestSprintScore?: number;
};

export function useAchievementStats() {
  const { signedIn, solvedIds, attempts } = useProgress();
  const [fetched, setFetched] = useState<ExtraStats | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setFetched(null);
      return;
    }

    let cancelled = false;
    fetch("/api/user/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApiStats | null) => {
        if (cancelled || !data) return;
        setFetched({
          rank: data.rank ?? data.solvedRank ?? null,
          bestSprint: data.bestSprint ?? data.bestSprintScore ?? 0,
          totalRankedUsers: data.totalRankedUsers ?? 0,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const inputs = useMemo((): AchievementInputs => {
    const dayKeys = dayKeysFromAttempts(attempts);
    return {
      solved: solvedIds.size,
      longestStreak: longestStreakFromDayKeys(dayKeys),
      rank: fetched?.rank ?? null,
      bestSprint: fetched?.bestSprint ?? 0,
      totalRankedUsers: fetched?.totalRankedUsers ?? 0,
    };
  }, [attempts, solvedIds.size, fetched]);

  return useMemo(() => achievementSummary(inputs), [inputs]);
}
