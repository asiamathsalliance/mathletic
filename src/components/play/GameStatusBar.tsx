"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGameProfile, type GameProfile, type BadgeId } from "@/lib/gameProfile";
import { PLAY_CATEGORIES } from "@/lib/playConfig";
import { xpProgressInLevel } from "@/lib/gameScoring";
import { XP_LEVEL_THRESHOLDS } from "@/lib/playConfig";

export function GameStatusBar() {
  const [profile, setProfile] = useState<GameProfile | null>(null);

  useEffect(() => {
    setProfile(getGameProfile());
    const onUpdate = () => setProfile(getGameProfile());
    window.addEventListener("game-profile-updated", onUpdate);
    return () => window.removeEventListener("game-profile-updated", onUpdate);
  }, []);

  if (!profile) {
    return (
      <div className="stats stats-skeleton" aria-hidden>
        <div className="pill"><span className="label">XP</span><span className="value">—</span></div>
      </div>
    );
  }

  const allBadges = new Set<BadgeId>(PLAY_CATEGORIES.flatMap((c) => profile.categories[c].badges));
  const maxStreak = Math.max(...PLAY_CATEGORIES.map((c) => profile.categories[c].streakDays));
  const totalXp = PLAY_CATEGORIES.reduce((s, c) => s + profile.categories[c].xp, 0);

  return (
    <div className="stats">
      <div className="pill">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--yellow)" aria-hidden>
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z" />
        </svg>
        <span className="label">XP</span>
        <span className="value">{totalXp}</span>
      </div>
      <div className="pill">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--red)" aria-hidden>
          <path d="M12 2c-1.4 3.8-5.6 4.8-5.6 9.4a5.6 5.6 0 0 0 11.2 0c0-1.8-.9-2.8-1.4-3.6.2 1.8-.9 3.2-2.3 3.2s-2.1-1.1-2.1-2.4c0-1.9 1.8-2.8.2-6.6z" />
        </svg>
        <span className="label">Streak</span>
        <span className="value">{maxStreak}d</span>
      </div>
      <Link href="/play/profile" className="pill pill-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--green-deep)" aria-hidden>
          <path d="M6 4h12v2a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4z" />
          <path d="M9 14h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2z" />
          <path d="M10 17h4v2h-4z" />
        </svg>
        <span className="label">Badges</span>
        <span className="value">{allBadges.size}</span>
      </Link>

      <div className="level-group">
        {PLAY_CATEGORIES.map((cat) => {
          const p = profile.categories[cat];
          const progress = xpProgressInLevel(p.xp, XP_LEVEL_THRESHOLDS);
          return (
            <div key={cat} className="level">
              <div className="level-top">
                <span>{cat}</span>
                <span>Lv.{p.level}</span>
              </div>
              <div className="level-bar">
                <span style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <Link href="/play/profile" className="all-badges">
        All badges
      </Link>
    </div>
  );
}
