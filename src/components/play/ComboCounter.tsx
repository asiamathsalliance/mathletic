"use client";

import { cn } from "@/lib/utils";

interface ComboCounterProps {
  combo: number;
  milestone?: boolean;
}

export function ComboCounter({ combo, milestone }: ComboCounterProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium",
        milestone && "border-primary/50 text-primary"
      )}
    >
      <span className="text-meta normal-case tracking-normal">Combo</span>
      <span className="tabular-nums">{combo.toFixed(1)}x</span>
    </div>
  );
}
