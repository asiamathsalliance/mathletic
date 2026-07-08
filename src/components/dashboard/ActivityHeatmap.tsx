"use client";

import type { ActivityDay } from "@/lib/progressStats";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  data: ActivityDay[];
  weeks?: number;
}

function level(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const LEVEL_CLASS = [
  "bg-muted",
  "bg-[#E8F0C4]",
  "bg-[#CFE083]",
  "bg-[#B8D444]",
  "bg-[#8FA82F]",
];

export function ActivityHeatmap({ data, weeks = 52 }: ActivityHeatmapProps) {
  const slice = data.slice(-weeks * 7);
  const columns: ActivityDay[][] = [];
  for (let i = 0; i < slice.length; i += 7) {
    columns.push(slice.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} activities`}
                className={cn("size-3 rounded-sm", LEVEL_CLASS[level(day.count)])}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Last {weeks} weeks of practice activity</p>
    </div>
  );
}
