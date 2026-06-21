"use client";

interface ComboCounterProps {
  combo: number;
  milestone?: boolean;
}

export function ComboCounter({ combo, milestone }: ComboCounterProps) {
  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--game-forest)] bg-[var(--game-sage)] px-4 py-2 font-bold text-[var(--game-forest)] ${milestone ? "game-burst" : ""}`}
    >
      <span className="text-xs uppercase tracking-wide">Combo</span>
      <span className="text-lg tabular-nums">{combo.toFixed(1)}x</span>
    </div>
  );
}
