"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Trophy, ChevronRight, Zap, Flame, Target, Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlotReelNumber } from "@/components/sprint/SlotReelNumber";
import type { SprintModeType } from "@/lib/sprint";
import {
  SPRINT_ACHIEVEMENT_PAUSE_MS,
  SPRINT_REEL_DURATION_MS,
  SPRINT_REEL_STAGGER_MS,
  SPRINT_RESULTS_FRAME_MS,
} from "@/lib/sprintTransition";
import { cn } from "@/lib/utils";

export interface SprintResultData {
  score: number;
  problemsSolved: number;
  attemptsCount: number;
  bestStreak: number;
  personalBest: number;
  modeType: SprintModeType;
  newAchievements: { key: string; title: string; description: string | null }[];
}

const PRIMARY_REEL_COUNT = 2;

const RESULTS_CARD_CLASS =
  "rounded-2xl border border-border/60 bg-card px-8 py-10 sm:px-10 sm:py-12 shadow-[0_1px_3px_rgba(34,52,26,0.06),0_8px_24px_rgba(34,52,26,0.04)]";

export function SprintResults({
  results,
  backHref,
}: {
  results: SprintResultData;
  backHref: string;
}) {
  const isMult = results.modeType === "MULTIPLICATION";
  const [frameVisible, setFrameVisible] = useState(false);
  const [reelsActive, setReelsActive] = useState(false);
  const [reelsDone, setReelsDone] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);

  const hasAchievements = results.newAchievements.length > 0;

  const onReelSettled = useCallback(() => {
    setReelsDone((n) => n + 1);
  }, []);

  useEffect(() => {
    const frameRaf = requestAnimationFrame(() => setFrameVisible(true));
    const reelTimer = setTimeout(() => setReelsActive(true), SPRINT_RESULTS_FRAME_MS);
    return () => {
      cancelAnimationFrame(frameRaf);
      clearTimeout(reelTimer);
    };
  }, []);

  useEffect(() => {
    if (reelsDone < PRIMARY_REEL_COUNT) return;
    if (!hasAchievements) return;
    const t = setTimeout(() => setShowAchievements(true), SPRINT_ACHIEVEMENT_PAUSE_MS);
    return () => clearTimeout(t);
  }, [reelsDone, hasAchievements]);

  const accuracy =
    results.attemptsCount > 0
      ? Math.round((results.problemsSolved / results.attemptsCount) * 100)
      : 0;

  return (
    <div
      className={cn(
        "sprint-results-enter mx-auto max-w-2xl px-4 py-8 text-center",
        frameVisible && "sprint-results-enter-active"
      )}
    >
      <div className={cn(RESULTS_CARD_CLASS, "relative space-y-6")}>
        <Link
          href={backHref}
          className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-5 sm:top-5"
          aria-label="Back to sprint"
        >
          <X className="size-4" strokeWidth={2} />
        </Link>

        <div>
          <Trophy className="mx-auto size-12 text-[#C9941F]" />
          <h1 className="text-page-title mt-3">Sprint complete</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isMult ? "Multiplication Sprint" : "Problem Sprint"}
          </p>
        </div>

        <div className="space-y-10">
          <div className="my-6 flex justify-center sm:my-8">
            <div className="flex size-48 flex-col items-center justify-center rounded-full border-2 border-[#22341A] bg-background sm:size-52">
              <SlotReelNumber
                value={results.problemsSolved}
                active={reelsActive}
                delayMs={0}
                durationMs={SPRINT_REEL_DURATION_MS}
                onSettled={onReelSettled}
                className="text-5xl font-bold leading-none tracking-tight sm:text-[3.25rem]"
              />
              <p className="text-muted-foreground mt-2 px-3 text-center text-xs sm:text-sm">
                problems solved
              </p>
            </div>
          </div>

          <div className="mx-auto grid max-w-sm grid-cols-3 gap-2.5 sm:max-w-md sm:gap-3">
            <StatCard icon={<Target className="size-4" />} label="Attempts" value={results.attemptsCount} />
            <StatCard
              icon={<Flame className="size-4" />}
              label="Best streak"
              value={
                <SlotReelNumber
                  value={results.bestStreak}
                  active={reelsActive}
                  delayMs={SPRINT_REEL_STAGGER_MS}
                  durationMs={SPRINT_REEL_DURATION_MS}
                  onSettled={onReelSettled}
                />
              }
            />
            <StatCard
              icon={<Zap className="size-4" />}
              label="Personal best"
              value={results.personalBest}
            />
            {!isMult && (
              <div className="col-span-3">
                <p className="text-muted-foreground text-xs">
                  Accuracy: {results.attemptsCount > 0 ? `${accuracy}%` : "—"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Link href={backHref} className="cursor-pointer">
            <Button className="min-w-[8.5rem] bg-[#1C4B3B] px-6 text-white hover:!bg-[#122f25] hover:text-white [a]:hover:!bg-[#122f25]">
              Play again
            </Button>
          </Link>
          <Link
            href={`/leaderboard?board=sprint&mode=${results.modeType}`}
            className="cursor-pointer"
          >
            <Button variant="outline">
              Leaderboard
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        {results.newAchievements.length > 0 && (
          <div
            className={cn(
              "space-y-3",
              showAchievements ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <p className="text-sm font-semibold text-[#1C4B3B]">Achievement unlocked!</p>
            {results.newAchievements.map((a, i) => (
              <div
                key={a.key}
                className={cn(
                  "rounded-xl border border-[#C9941F]/40 bg-[#FFF8E8] px-4 py-3 text-left",
                  showAchievements && "sprint-achievement-reveal"
                )}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="flex items-start gap-2">
                  <Award className="mt-0.5 size-4 shrink-0 text-[#C9941F]" />
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    {a.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs">{a.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 sm:p-3.5">
      <div className="text-muted-foreground mb-1 flex items-center justify-center gap-1 text-xs">
        {icon}
        {label}
      </div>
      <p className="text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
    </div>
  );
}
