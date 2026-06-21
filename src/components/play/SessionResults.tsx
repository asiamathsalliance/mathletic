"use client";

import Link from "next/link";
import { GameCard } from "./GameCard";
import { GameButton } from "./GameButton";
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

  return (
    <GameCard accent className="space-y-6 max-w-lg mx-auto text-center play-card-head">
      <h2 className="text-3xl font-bold text-[var(--game-forest)] font-[family-name:var(--font-game-heading)] pt-2">
        Run Complete!
      </h2>

      <div className="text-5xl font-bold text-[var(--game-forest)]">+{data.totalXp} XP</div>

      <div className="grid grid-cols-2 gap-4 text-left">
        <Stat label="Speed round" value={`${data.mcqScore} pts`} />
        <Stat label="Boss check" value={`${data.bossScore + data.bossTimeBonus} pts`} />
        <Stat label="Max combo" value={`${data.maxCombo.toFixed(1)}x`} />
        <Stat label="Accuracy" value={`${data.accuracy}%`} />
        <Stat label="MCQ correct" value={`${data.mcqCorrect}/${data.mcqTotal}`} />
        <Stat label="Time used" value={formatTime(data.totalTimeMs)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={`/play/${slug}/setup`}>
          <GameButton variant="secondary" className="w-full sm:w-auto">
            Play again
          </GameButton>
        </Link>
        <Link href="/play/profile">
          <GameButton variant="secondary" className="w-full sm:w-auto">
            View profile
          </GameButton>
        </Link>
      </div>
    </GameCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-[3px] border-[var(--game-forest)] bg-[var(--game-cream)] p-3">
      <p className="text-xs font-bold uppercase text-[var(--game-forest)]/70">{label}</p>
      <p className="text-lg font-bold text-[var(--game-forest)]">{value}</p>
    </div>
  );
}
