"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PLAY_CATEGORIES,
  PLAY_CATEGORY_LABELS,
  PLAY_CATEGORY_SLUG,
  type PlayCategory,
} from "@/lib/playConfig";
import { getGameProfile, type GameProfile } from "@/lib/gameProfile";
import { xpProgressInLevel } from "@/lib/gameScoring";
import { XP_LEVEL_THRESHOLDS } from "@/lib/playConfig";
import { PracticeMascot } from "./PracticeMascot";
import { CurriculumCardIcon } from "@/components/CurriculumCardIcon";

const MODE_DESCRIPTIONS: Record<PlayCategory, string> = {
  HSC: "NSW HSC speed rounds + boss checks",
  IB: "IB HL/SL gamified practice runs",
  "A-Level": "UK A-Level pure & stats challenges",
};

const CARD_CLASS: Record<PlayCategory, string> = {
  HSC: "card-hsc",
  IB: "card-ib",
  "A-Level": "card-neon",
};

function levelSubtitle(level: number, percent: number): string {
  if (level <= 1 && percent < 15) return "Just started";
  return `${percent}% to Lv.${level + 1}`;
}

function CardIcon({ cat }: { cat: PlayCategory }) {
  return <CurriculumCardIcon curriculum={cat} />;
}

export function PlayHomeClient() {
  const [profile, setProfile] = useState<GameProfile | null>(null);

  useEffect(() => {
    setProfile(getGameProfile());
    const onUpdate = () => setProfile(getGameProfile());
    window.addEventListener("game-profile-updated", onUpdate);
    return () => window.removeEventListener("game-profile-updated", onUpdate);
  }, []);

  const strongest = useMemo(() => {
    if (!profile) return null as PlayCategory | null;
    let best: PlayCategory = PLAY_CATEGORIES[0];
    let bestLevel = 0;
    for (const cat of PLAY_CATEGORIES) {
      const lv = profile.categories[cat].level;
      if (lv > bestLevel) {
        bestLevel = lv;
        best = cat;
      }
    }
    return bestLevel > 1 ? best : null;
  }, [profile]);

  return (
    <>
      <div className="hero">
        <PracticeMascot />
        <div className="hero-text">
          <h1>Practice mode</h1>
          <p>Pick your syllabus. Speed through MCQs, then face the boss check.</p>
        </div>
      </div>

      <div className="cards">
        {PLAY_CATEGORIES.map((cat) => {
          const p = profile?.categories[cat];
          const progress = p ? xpProgressInLevel(p.xp, XP_LEVEL_THRESHOLDS) : { percent: 0 };
          const level = p?.level ?? 1;
          const isStrongest = strongest === cat;

          return (
            <Link key={cat} href={`/play/${PLAY_CATEGORY_SLUG[cat]}/setup`} className={`card ${CARD_CLASS[cat]}`}>
              {isStrongest && <span className="ribbon">Lv.{level} · strongest</span>}
              <div className="badge-icon">
                <CardIcon cat={cat} />
              </div>
              <div className="card-title">{cat}</div>
              <div className="card-desc">{MODE_DESCRIPTIONS[cat]}</div>
              <div className="card-sub">
                Lv.{level} · {levelSubtitle(level, progress.percent)}
              </div>
              <span className="card-cta">{level > 1 ? "Continue practice" : "Start practice"}</span>
              <span className="sr-only">{PLAY_CATEGORY_LABELS[cat]}</span>
            </Link>
          );
        })}
      </div>

      <div className="actions">
        <Link href="/play/profile" className="btn btn-outline">
          View all badges
        </Link>
        <Link href="/browse" className="btn btn-fill">
          Browse question bank
        </Link>
      </div>
    </>
  );
}
