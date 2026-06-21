"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getGameProfile,
  getPersonalPercentileBand,
  type GameProfile,
} from "@/lib/gameProfile";
import { PLAY_CATEGORIES, PLAY_CATEGORY_LABELS } from "@/lib/playConfig";
import { xpProgressInLevel } from "@/lib/gameScoring";
import { XP_LEVEL_THRESHOLDS } from "@/lib/playConfig";
import { GameCard } from "@/components/play/GameCard";
import { GameButton } from "@/components/play/GameButton";
import { XpBar } from "@/components/play/XpBar";
import { BadgeGrid } from "@/components/play/BadgeGrid";
import { PLAY_CATEGORY_SLUG } from "@/lib/playConfig";

export function PlayProfileClient() {
  const [profile, setProfile] = useState<GameProfile | null>(null);

  useEffect(() => {
    setProfile(getGameProfile());
    const onUpdate = () => setProfile(getGameProfile());
    window.addEventListener("game-profile-updated", onUpdate);
    return () => window.removeEventListener("game-profile-updated", onUpdate);
  }, []);

  if (!profile) {
    return (
      <GameCard className="text-center py-12">
        <p className="font-bold text-[var(--game-forest)]">Loading profile...</p>
      </GameCard>
    );
  }

  return (
    <div className="play-subpage max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2 play-section-head">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--game-forest)] font-[family-name:var(--font-game-heading)]">
          Your Progress
        </h1>
        <p className="font-semibold text-[var(--game-forest)]/80">
          XP, levels, and badges per category
        </p>
      </div>

      {PLAY_CATEGORIES.map((cat) => {
        const p = profile.categories[cat];
        const progress = xpProgressInLevel(p.xp, XP_LEVEL_THRESHOLDS);
        const band = getPersonalPercentileBand(cat);
        return (
          <GameCard key={cat} className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--game-forest)] play-card-head">
              {PLAY_CATEGORY_LABELS[cat]}
            </h2>
            <XpBar
              label={cat}
              percent={progress.percent}
              current={progress.current}
              needed={progress.needed}
              level={p.level}
            />
            <p className="font-bold text-[var(--game-forest)]">
              Streak: {p.streakDays} day{p.streakDays !== 1 ? "s" : ""}
            </p>
            {band && (
              <p className="text-sm font-bold text-[var(--game-forest)]/80">{band}</p>
            )}
            <Link href={`/play/${PLAY_CATEGORY_SLUG[cat]}/setup`}>
              <GameButton variant="secondary" className="w-full sm:w-auto">
                Play {cat}
              </GameButton>
            </Link>
          </GameCard>
        );
      })}

      <GameCard className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--game-forest)] play-card-head">Badges</h2>
        <BadgeGrid
          badges={[...new Set(PLAY_CATEGORIES.flatMap((c) => profile.categories[c].badges))]}
        />
      </GameCard>

      <GameCard className="text-center opacity-80">
        <p className="font-bold text-[var(--game-forest)]">Global leaderboard coming soon</p>
        <p className="text-sm font-semibold mt-1">Percentile bands use your local run history for now.</p>
      </GameCard>

      <Link href="/play">
        <GameButton variant="secondary" className="w-full">
          Back to play modes
        </GameButton>
      </Link>
    </div>
  );
}
