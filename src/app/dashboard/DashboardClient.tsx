"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Trophy, Zap, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Question } from "@/types/question";
import { getSolvedMap } from "@/lib/progress";
import { getGameProfile } from "@/lib/gameProfile";
import { useProgress } from "@/lib/useProgress";
import type { DashboardLeaderboardStats } from "@/lib/dashboardStats";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { SolvedStatsCard } from "@/components/dashboard/SolvedStatsCard";
import { useAchievementStats } from "@/lib/profile/useAchievementStats";
import { ACHIEVEMENTS } from "@/lib/profile/constants";

const COMPETITION_GROUPS = [
  { key: "AMC 10", match: (q: Question) => q.competition === "AMC10" },
  { key: "AMC 12", match: (q: Question) => q.competition === "AMC12" },
  {
    key: "Other",
    match: (q: Question) => q.competition !== "AMC10" && q.competition !== "AMC12",
  },
] as const;

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardClient({
  questions,
  leaderboardStats,
  fromProfile = false,
}: {
  questions: Question[];
  leaderboardStats: DashboardLeaderboardStats | null;
  fromProfile?: boolean;
}) {
  const allQuestions = questions;
  const { signedIn, attempts, solvedIds } = useProgress();

  const solvedEntries = useMemo(() => {
    if (signedIn) {
      return attempts
        .filter((a) => a.status === "solved" && a.solved_at)
        .map((a) => ({ id: a.question_id, solvedAt: new Date(a.solved_at as string).getTime() }));
    }
    return Object.entries(getSolvedMap()).map(([id, e]) => ({ id, solvedAt: e.solvedAt }));
  }, [signedIn, attempts]);

  const difficultyById = useMemo(
    () => new Map(allQuestions.map((q) => [q.id, q.difficulty])),
    [allQuestions]
  );

  const solvedStats = useMemo(() => {
    const byDifficulty = {
      Easy: { total: 0, solved: 0 },
      Medium: { total: 0, solved: 0 },
      Hard: { total: 0, solved: 0 },
    };
    let solvedTotal = 0;
    for (const q of allQuestions) {
      const bucket = byDifficulty[q.difficulty];
      if (!bucket) continue;
      bucket.total += 1;
      if (solvedIds.has(q.id)) {
        bucket.solved += 1;
        solvedTotal += 1;
      }
    }
    return { total: allQuestions.length, solvedTotal, byDifficulty };
  }, [allQuestions, solvedIds]);

  const attemptingCount = useMemo(() => {
    if (!signedIn) return 0;
    return attempts.filter((a) => a.status === "attempted").length;
  }, [signedIn, attempts]);

  const competitionProgress = useMemo(() => {
    return COMPETITION_GROUPS.map(({ key, match }) => {
      let total = 0;
      let solved = 0;
      for (const q of allQuestions) {
        if (!match(q)) continue;
        total += 1;
        if (solvedIds.has(q.id)) solved += 1;
      }
      return {
        key,
        total,
        solved,
        percent: total > 0 ? Math.round((solved / total) * 100) : 0,
      };
    });
  }, [allQuestions, solvedIds]);

  const profile = useMemo(() => getGameProfile(), []);

  const activity = useMemo(() => {
    type DayBucket = { count: number; Easy: number; Medium: number; Hard: number };
    const buckets: Record<string, DayBucket> = {};

    const addSolve = (dateKey: string, questionId: string) => {
      if (!buckets[dateKey]) buckets[dateKey] = { count: 0, Easy: 0, Medium: 0, Hard: 0 };
      buckets[dateKey].count += 1;
      const diff = difficultyById.get(questionId);
      if (diff === "Easy" || diff === "Medium" || diff === "Hard") {
        buckets[dateKey][diff] += 1;
      }
    };

    for (const e of solvedEntries) {
      addSolve(dayKey(e.solvedAt), e.id);
    }
    if (!signedIn) {
      for (const run of profile.runHistory ?? []) {
        const key = dayKey(run.completedAt);
        if (!buckets[key]) buckets[key] = { count: 0, Easy: 0, Medium: 0, Hard: 0 };
        buckets[key].count += 1;
      }
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
      const key = dayKey(cursor.getTime());
      const bucket = buckets[key];
      result.push({
        date: key,
        count: bucket?.count ?? 0,
        byDifficulty: bucket
          ? { Easy: bucket.Easy, Medium: bucket.Medium, Hard: bucket.Hard }
          : undefined,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [solvedEntries, signedIn, profile, difficultyById]);

  const recent = useMemo(
    () =>
      [...solvedEntries]
        .sort((a, b) => b.solvedAt - a.solvedAt)
        .slice(0, 12)
        .map((e) => ({
          id: `solved-${e.id}`,
          label: `Solved ${e.id}`,
          meta: difficultyById.get(e.id) ?? "",
          timestamp: e.solvedAt,
        })),
    [solvedEntries, difficultyById]
  );

  const streak = useMemo(() => {
    const days = new Set(solvedEntries.map((e) => dayKey(e.solvedAt)));
    let count = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor.getTime()))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [solvedEntries]);

  const { earned: achievementsEarned } = useAchievementStats();

  const streakLabel = streak === 1 ? "1 day" : `${streak} days`;

  return (
    <div className="space-y-8">
      <div>
        {fromProfile ? (
          <div className="flex items-start gap-3">
            <Link
              href="/profile"
              className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to profile"
            >
              <ArrowLeft className="size-4" strokeWidth={2.25} />
            </Link>
            <div>
              <h1 className="text-page-title">Progress</h1>
              <p className="mt-1 text-muted-foreground">Stats, activity, and how you&apos;re improving</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-page-title">Progress</h1>
            <p className="text-muted-foreground mt-1">Stats, activity, and how you&apos;re improving</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Solved" value={`${solvedStats.solvedTotal}/${solvedStats.total}`} />
        <StatCard
          label="Progress"
          value={
            solvedStats.total > 0
              ? `${Math.round((solvedStats.solvedTotal / solvedStats.total) * 100)}%`
              : "—"
          }
        />
        <StatCard label="Streak" value={streakLabel} />
        <StatCard
          label="Achievements"
          value={`${achievementsEarned}/${ACHIEVEMENTS.length}`}
        />
      </div>

      <SolvedStatsCard
        solvedTotal={solvedStats.solvedTotal}
        total={solvedStats.total}
        attempting={attemptingCount}
        byDifficulty={solvedStats.byDifficulty}
        byCompetition={competitionProgress}
      />

      <ActivityHeatmap data={activity} title="Activity" />

      <Card className="mt-14 border-2 border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-section-header">Leaderboard highlights</CardTitle>
          <Link
            href="/leaderboard"
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            View leaderboard →
          </Link>
        </CardHeader>
        <CardContent>
          {!signedIn ? (
            <p className="text-sm text-muted-foreground">
              Sign in to track sprint scores and your rank on the leaderboard.
            </p>
          ) : !leaderboardStats ? (
            <p className="text-sm text-muted-foreground">Loading leaderboard stats…</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <HighlightStat
                icon={<Zap className="size-4 text-[#8FA82F]" />}
                label="Best sprint score"
                value={leaderboardStats.bestSprintScore > 0 ? String(leaderboardStats.bestSprintScore) : "—"}
              />
              <HighlightStat
                icon={<Zap className="size-4 text-[#C9941F]" />}
                label="Sprint runs"
                value={String(leaderboardStats.sprintRuns)}
              />
              <HighlightStat
                icon={<Trophy className="size-4 text-[#C9941F]" />}
                label="Most solved rank"
                value={
                  leaderboardStats.solvedRank != null
                    ? `#${leaderboardStats.solvedRank}`
                    : "—"
                }
                detail={
                  leaderboardStats.totalRankedUsers > 0
                    ? `of ${leaderboardStats.totalRankedUsers} users`
                    : undefined
                }
              />
              <HighlightStat
                icon={<Trophy className="size-4 text-[#2F7D4F]" />}
                label="Best sprint rank"
                value={
                  leaderboardStats.sprintRank != null
                    ? `#${leaderboardStats.sprintRank}`
                    : "—"
                }
                detail={
                  leaderboardStats.bestSprintAccuracy != null
                    ? `${leaderboardStats.bestSprintCorrect}/${leaderboardStats.bestSprintAnswered} correct (${leaderboardStats.bestSprintAccuracy}%)`
                    : undefined
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-section-header">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Start practicing!</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0"
                >
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {item.meta} · {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-2 border-border gap-1 py-4">
      <CardContent className="pt-1.5 pb-1">
        <p className="text-meta leading-none">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function HighlightStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
