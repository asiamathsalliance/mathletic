"use client";

interface XpBarProps {
  label: string;
  percent: number;
  current: number;
  needed: number;
  level: number;
}

export function XpBar({ label, percent, current, needed, level }: XpBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-bold text-[var(--game-forest)]">
        <span>{label}</span>
        <span>Lv. {level}</span>
      </div>
      <div className="h-6 rounded-full border-[3px] border-[var(--game-forest)] bg-[var(--game-cream)] overflow-hidden game-shadow">
        <div
          className="h-full bg-[var(--game-sage)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm font-semibold text-[var(--game-forest)]/80">
        {current} / {needed} XP to next level
      </p>
    </div>
  );
}
