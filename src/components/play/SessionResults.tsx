"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayCategory } from "@/lib/playConfig";
import { PLAY_CATEGORY_SLUG } from "@/lib/playConfig";

export interface SessionResultsData {
  totalXp: number;
  mcqScore: number;
  bossScore: number;
  bossTimeBonus: number;
  maxCombo: number;
  accuracy: number;
  totalTimeMs: number;
  mcqCorrect: number;
  mcqTotal: number;
  category: PlayCategory;
}

function formatTime(ms: number): string {
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function SessionResults({ data }: { data: SessionResultsData }) {
  const slug = PLAY_CATEGORY_SLUG[data.category];
  const totalPoints = data.mcqScore + data.bossScore + data.bossTimeBonus;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-page-title">Challenge complete</CardTitle>
        <p className="text-2xl font-semibold text-foreground mt-2">{totalPoints} pts</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 text-left">
          <Stat label="Speed round" value={`${data.mcqScore} pts`} />
          <Stat label="Boss check" value={`${data.bossScore + data.bossTimeBonus} pts`} />
          <Stat label="Max combo" value={`${data.maxCombo.toFixed(1)}x`} />
          <Stat label="Accuracy" value={`${data.accuracy}%`} />
          <Stat label="MCQ correct" value={`${data.mcqCorrect}/${data.mcqTotal}`} />
          <Stat label="Time used" value={formatTime(data.totalTimeMs)} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/challenge/${slug}/setup`}
            className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
          >
            Play again
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
          >
            View dashboard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/50 p-3">
      <p className="text-meta">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  );
}
