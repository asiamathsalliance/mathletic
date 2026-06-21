"use client";

import { BADGE_LABELS, type BadgeId } from "@/lib/gameProfile";
import { GameCard } from "./GameCard";

interface BadgeGridProps {
  badges: BadgeId[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const allBadges = Object.keys(BADGE_LABELS) as BadgeId[];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {allBadges.map((id) => {
        const earned = badges.includes(id);
        return (
          <GameCard
            key={id}
            accent={earned}
            className={`text-center py-4 ${!earned ? "opacity-40" : ""}`}
          >
            <p className="font-bold text-sm text-[var(--game-forest)]">{BADGE_LABELS[id]}</p>
            <p className="text-xs mt-1 font-semibold">{earned ? "Earned" : "Locked"}</p>
          </GameCard>
        );
      })}
    </div>
  );
}
