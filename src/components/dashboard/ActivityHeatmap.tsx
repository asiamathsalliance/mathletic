"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ActivityDay, ActivityDayBreakdown } from "@/lib/progressStats";
import {
  ActivityLegend,
  ActivityMonth,
  groupDaysByMonth,
} from "@/components/dashboard/ActivityMonth";
import { cn } from "@/lib/utils";

const EMPTY_BREAKDOWN: ActivityDayBreakdown = { Easy: 0, Medium: 0, Hard: 0 };
const MONTH_GAP_PX = 20;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatTooltipDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function computeSummary(days: ActivityDay[]) {
  const totalSolved = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0);

  const sorted = activeDays.map((d) => d.date).sort();
  let maxStreak = 0;
  let run = 0;
  let prev: string | null = null;

  for (const date of sorted) {
    if (prev) {
      const prevD = new Date(prev);
      const curD = new Date(date);
      const diff = (curD.getTime() - prevD.getTime()) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    maxStreak = Math.max(maxStreak, run);
    prev = date;
  }

  const activeSet = new Set(sorted);
  let currentStreak = 0;
  const cursor = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!activeSet.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeSet.has(fmt(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalSolved,
    totalActiveDays: activeDays.length,
    maxStreak,
    currentStreak,
  };
}

function useCountUp(target: number, active: boolean, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

interface TooltipState {
  day: ActivityDay;
  rect: DOMRect;
}

function ActivityTooltip({ day, rect }: TooltipState) {
  if (typeof document === "undefined" || !document.body) return null;
  const breakdown = day.byDifficulty ?? EMPTY_BREAKDOWN;

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 min-w-[10.5rem] rounded-lg border border-border/40 bg-card px-4 py-3.5 shadow-[0_8px_30px_rgba(34,52,26,0.12)]"
      style={{
        left: rect.left + rect.width / 2,
        top: rect.top - 10,
        transform: "translate(-50%, -100%)",
      }}
      role="tooltip"
    >
      <p className="text-sm font-semibold text-foreground">{formatTooltipDate(day.date)}</p>
      <div className="mt-2.5 space-y-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Solved</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {day.count} {day.count === 1 ? "Problem" : "Problems"}
          </p>
        </div>
        {day.count > 0 && (
          <div className="space-y-1 border-t border-border/50 pt-2 text-xs">
            <p>
              Easy{" "}
              <span className="font-semibold tabular-nums text-[#14B8A6]">{breakdown.Easy}</span>
            </p>
            <p>
              Medium{" "}
              <span className="font-semibold tabular-nums text-[#F59E0B]">{breakdown.Medium}</span>
            </p>
            <p>
              Hard{" "}
              <span className="font-semibold tabular-nums text-[#EF4444]">{breakdown.Hard}</span>
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function SummaryStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground sm:text-[1.75rem]">
        {value.toLocaleString()}
        {suffix && (
          <span className="ml-1 text-base font-semibold text-muted-foreground">{suffix}</span>
        )}
      </p>
    </div>
  );
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  /** Section title shown above the summary row (e.g. "Activity" on dashboard). */
  title?: string;
}

export function ActivityHeatmap({ data, title }: ActivityHeatmapProps) {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRef = useRef<{ startX: number; scrollLeft: number; pointerId: number } | null>(null);
  const activeMonthKey = useMemo(() => currentMonthKey(), []);

  useEffect(() => setMounted(true), []);

  const scrollToCurrentMonth = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = scrollRef.current;
      const el =
        monthRefs.current.get(activeMonthKey) ??
        monthRefs.current.get([...monthRefs.current.keys()].at(-1) ?? "");

      if (!container || !el) return;

      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      if (maxScroll === 0) return;

      const elLeft = el.offsetLeft;
      const elRight = elLeft + el.offsetWidth;
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth;

      if (elLeft >= viewLeft && elRight <= viewRight) return;

      // Anchor the current month toward the right edge (recent activity in view).
      let target = elRight - container.clientWidth + MONTH_GAP_PX;
      target = Math.max(0, Math.min(target, maxScroll));
      container.scrollTo({ left: target, behavior });
    },
    [activeMonthKey]
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => scrollToCurrentMonth());
    observer.observe(container);
    return () => observer.disconnect();
  }, [scrollToCurrentMonth]);

  const onScrollPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    const container = scrollRef.current;
    if (!container) return;

    dragRef.current = {
      startX: e.clientX,
      scrollLeft: container.scrollLeft,
      pointerId: e.pointerId,
    };
    setIsDragging(true);
    container.setPointerCapture(e.pointerId);
  }, []);

  const onScrollPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const container = scrollRef.current;
    if (!drag || !container) return;

    container.scrollLeft = drag.scrollLeft - (e.clientX - drag.startX);
  }, []);

  const endScrollDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const container = scrollRef.current;
    if (!drag || !container) return;

    if (container.hasPointerCapture(drag.pointerId)) {
      container.releasePointerCapture(drag.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const setMonthRef = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) monthRefs.current.set(key, node);
    else monthRefs.current.delete(key);
  }, []);

  const summary = useMemo(() => computeSummary(data), [data]);
  const months = useMemo(() => groupDaysByMonth(data), [data]);
  const calendarYear = useMemo(
    () => (data.length > 0 ? data[data.length - 1].date.slice(0, 4) : String(new Date().getFullYear())),
    [data]
  );

  useEffect(() => {
    if (!mounted || months.length === 0) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToCurrentMonth());
    });
    return () => cancelAnimationFrame(id);
  }, [mounted, months, scrollToCurrentMonth]);

  const animatedTotal = useCountUp(summary.totalSolved, mounted);
  const animatedActive = useCountUp(summary.totalActiveDays, mounted);
  const animatedMax = useCountUp(summary.maxStreak, mounted);
  const animatedCurrent = useCountUp(summary.currentStreak, mounted);

  const showTooltip = useCallback((day: ActivityDay, el: HTMLElement) => {
    setTooltip({ day, rect: el.getBoundingClientRect() });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  let cellOffset = 0;
  const monthMeta = months.map((month) => {
    const cellCount = month.weeks.reduce((n, w) => n + w.length, 0);
    const meta = { cellDelayStart: cellOffset, labelDelayMs: cellOffset * 12 + 200 };
    cellOffset += cellCount;
    return meta;
  });

  return (
    <div
      className={cn(
        "activity-heatmap rounded-[24px] bg-card px-6 py-8 sm:px-10 sm:py-10",
        "[--heatmap-cell:20px] [--heatmap-gap:4px]",
        "sm:[--heatmap-cell:22px] sm:[--heatmap-gap:5px]",
        "lg:[--heatmap-cell:24px] lg:[--heatmap-gap:5px]",
        "shadow-[0_1px_3px_rgba(34,52,26,0.05),0_8px_28px_rgba(34,52,26,0.04)]"
      )}
    >
      {title && <h2 className="text-section-header mb-6">{title}</h2>}

      {/* Summary row */}
      <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
            {animatedTotal.toLocaleString()}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
            Problems Solved in {calendarYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8 lg:gap-10">
          <SummaryStat label="Total Active Days" value={animatedActive} />
          <div className="hidden h-10 w-px bg-border/70 sm:block" aria-hidden />
          <SummaryStat
            label="Max Streak"
            value={animatedMax}
            suffix={animatedMax === 1 ? "Day" : "Days"}
          />
          <div className="hidden h-10 w-px bg-border/70 sm:block" aria-hidden />
          <SummaryStat
            label="Current Streak"
            value={animatedCurrent}
            suffix={animatedCurrent === 1 ? "Day" : "Days"}
          />
        </div>
      </div>

      {/* Month-grouped heatmap */}
      <div
        ref={scrollRef}
        role="region"
        aria-label="Activity calendar — drag horizontally to browse months"
        className={cn(
          "overflow-x-auto pb-2 touch-pan-x snap-x snap-mandatory",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        )}
        onPointerDown={onScrollPointerDown}
        onPointerMove={onScrollPointerMove}
        onPointerUp={endScrollDrag}
        onPointerCancel={endScrollDrag}
        onMouseLeave={hideTooltip}
      >
        <div className="flex w-full min-w-max items-start justify-start lg:min-w-max lg:justify-start">
          {months.map((month, i) => (
            <div
              key={month.key}
              ref={(node) => setMonthRef(month.key, node)}
              data-month-key={month.key}
              className={cn(
                "shrink-0 snap-center",
                month.key === activeMonthKey && "scroll-mt-0"
              )}
              style={{ marginRight: i < months.length - 1 ? MONTH_GAP_PX : 0 }}
            >
              <ActivityMonth
                month={month}
                mounted={mounted}
                labelDelayMs={monthMeta[i].labelDelayMs}
                cellDelayStart={monthMeta[i].cellDelayStart}
                onCellEnter={showTooltip}
                onCellLeave={hideTooltip}
              />
            </div>
          ))}
        </div>
      </div>

      <ActivityLegend />

      {tooltip && mounted && <ActivityTooltip {...tooltip} />}
    </div>
  );
}
