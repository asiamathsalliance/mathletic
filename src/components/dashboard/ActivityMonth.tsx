"use client";

import type { ActivityDay } from "@/lib/progressStats";
import { cn } from "@/lib/utils";

/** Default heatmap cell size — overridden via CSS vars on `.activity-heatmap`. */
export const HEATMAP_CELL = 22;
export const HEATMAP_GAP = 5;
const ROWS = 7;

export interface MonthBlockData {
  key: string;
  label: string;
  weeks: (ActivityDay | null)[][];
}

export function buildMonthWeeks(days: ActivityDay[]): (ActivityDay | null)[][] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const weeks: (ActivityDay | null)[][] = [];
  let week: (ActivityDay | null)[] = Array(ROWS).fill(null);

  for (const day of sorted) {
    const [y, m, d] = day.date.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();

    if (dow === 0 && week.some((c) => c !== null)) {
      weeks.push(week);
      week = Array(ROWS).fill(null);
    }
    week[dow] = day;
  }
  weeks.push(week);
  return weeks;
}

export function groupDaysByMonth(days: ActivityDay[]): MonthBlockData[] {
  const map = new Map<string, ActivityDay[]>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(day);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monthDays]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
      return { key, label, weeks: buildMonthWeeks(monthDays) };
    });
}

export function cellColor(count: number): string {
  if (count === 0) return "#F6F0E3";
  if (count === 1) return "#E5F6D6";
  if (count <= 4) return "#C7EA91";
  if (count <= 9) return "#8DD44A";
  if (count <= 19) return "#4CAF50";
  return "#2E7D32";
}

interface ActivityMonthProps {
  month: MonthBlockData;
  mounted: boolean;
  labelDelayMs: number;
  cellDelayStart: number;
  onCellEnter: (day: ActivityDay, el: HTMLElement) => void;
  onCellLeave: () => void;
}

export function ActivityMonth({
  month,
  mounted,
  labelDelayMs,
  cellDelayStart,
  onCellEnter,
  onCellLeave,
}: ActivityMonthProps) {
  let cellIndex = 0;

  return (
    <div
      className="flex shrink-0 snap-center flex-col items-center"
      style={{ scrollSnapAlign: "center" }}
    >
      <div
        className="flex"
        style={{ gap: "var(--heatmap-gap, 5px)" }}
        onMouseLeave={onCellLeave}
      >
        {month.weeks.map((week, wi) => (
          <div
            key={wi}
            className="flex flex-col"
            style={{ gap: "var(--heatmap-gap, 5px)" }}
          >
            {week.map((day, di) => {
              const delay = cellDelayStart + cellIndex * 12;
              cellIndex += 1;
              const cellSize = "var(--heatmap-cell, 22px)";
              if (!day) {
                return (
                  <div
                    key={`${month.key}-empty-${wi}-${di}`}
                    style={{ width: cellSize, height: cellSize }}
                    aria-hidden
                  />
                );
              }
              const color = cellColor(day.count);
              return (
                <button
                  key={day.date}
                  type="button"
                  aria-label={`${day.date}: ${day.count} solved`}
                  className={cn(
                    "activity-heatmap-cell shrink-0 rounded-[5px] outline-none",
                    "transition-transform duration-[250ms] ease-out",
                    "hover:scale-[1.12] focus-visible:scale-[1.12] focus-visible:ring-2 focus-visible:ring-[#B8D444]/50",
                    !mounted && "opacity-0"
                  )}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: color,
                    animationDelay: mounted ? `${delay}ms` : undefined,
                  }}
                  onMouseEnter={(e) => onCellEnter(day, e.currentTarget)}
                  onFocus={(e) => onCellEnter(day, e.currentTarget)}
                  onBlur={onCellLeave}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p
        className={cn(
          "mt-3 w-full text-center text-xs font-medium text-muted-foreground",
          !mounted && "opacity-0"
        )}
        style={{
          animation: mounted ? `activity-label-in 400ms ease-out ${labelDelayMs}ms both` : undefined,
        }}
      >
        {month.label}
      </p>
    </div>
  );
}

export function ActivityLegend() {
  const items = [
    { label: "0", color: "#F6F0E3" },
    { label: "1", color: "#E5F6D6" },
    { label: "2–4", color: "#C7EA91" },
    { label: "5–9", color: "#8DD44A" },
    { label: "10–19", color: "#4CAF50" },
    { label: "20+", color: "#2E7D32" },
  ];

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="mr-1">Less</span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <div
            className="rounded-[5px]"
            style={{
              width: "var(--heatmap-cell, 22px)",
              height: "var(--heatmap-cell, 22px)",
              backgroundColor: item.color,
            }}
          />
          <span className="sr-only">{item.label}</span>
        </div>
      ))}
      <span className="ml-1">More</span>
    </div>
  );
}
