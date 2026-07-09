"use client";

import { cn } from "@/lib/utils";

export function TodayDateCircle() {
  const now = new Date();
  const day = now.getDate();
  const weekday = now.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const month = now.toLocaleDateString(undefined, { month: "short" });

  return (
    <div
      className="flex shrink-0 items-center justify-center lg:self-center"
      aria-label={`Today is ${now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`}
    >
      <div
        className={cn(
          "flex size-[150px] flex-col items-center justify-center rounded-full",
          "border-[3px] border-[#B8D444]/70 bg-[#FFFDF7]",
          "shadow-[0_2px_12px_rgba(34,52,26,0.06)]",
          "transition-transform duration-300 ease-out hover:scale-[1.04]"
        )}
      >
        <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">
          {weekday}
        </span>
        <span className="mt-1 text-[3.25rem] font-bold leading-none tabular-nums text-foreground">
          {day}
        </span>
        <span className="mt-1.5 text-sm font-medium text-muted-foreground">{month}</span>
      </div>
    </div>
  );
}
