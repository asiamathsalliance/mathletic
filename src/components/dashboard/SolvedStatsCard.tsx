"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import type { Difficulty } from "@/types/question";
import { cn } from "@/lib/utils";

interface DifficultyStats {
  solved: number;
  total: number;
}

export interface CompetitionStats {
  key: string;
  solved: number;
  total: number;
  percent: number;
}

export interface SolvedStatsCardProps {
  solvedTotal: number;
  total: number;
  attempting: number;
  byDifficulty: Record<Difficulty, DifficultyStats>;
  byCompetition: CompetitionStats[];
}

const ORDER: Difficulty[] = ["Easy", "Medium", "Hard"];

const DIFFICULTY_STYLE: Record<
  Difficulty,
  { label: string; solved: string; remaining: string }
> = {
  Easy: { label: "Easy", solved: "#14B8A6", remaining: "#DDF7F3" },
  Medium: { label: "Medium", solved: "#F59E0B", remaining: "#FFF2D8" },
  Hard: { label: "Hard", solved: "#EF4444", remaining: "#FFE3E3" },
};

const COMPETITION_STYLE: Record<string, { solved: string; remaining: string }> = {
  "AMC 10": { solved: "#B8D444", remaining: "#E8F0C4" },
  "AMC 12": { solved: "#87C61A", remaining: "#EEF8D0" },
  Other: { solved: "#2F7D4F", remaining: "#E7F3EC" },
};

const ARC_GAP_DEG = 12;
const ARC_SPAN_DEG = (360 - 3 * ARC_GAP_DEG) / 3; // 108° per arc
const RADIUS = 94;
const STROKE = 16;
const SVG_SIZE = 268;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;

/** Clockwise arc positions (degrees from 3 o'clock): Easy top, Medium right, Hard left. */
const ARC_ANGLES: Record<Difficulty, { start: number; end: number }> = (() => {
  const easyStart = (270 - ARC_SPAN_DEG / 2 + 360) % 360;
  const easyEnd = (easyStart + ARC_SPAN_DEG) % 360;
  const mediumStart = (easyEnd + ARC_GAP_DEG) % 360;
  const mediumEnd = (mediumStart + ARC_SPAN_DEG) % 360;
  const hardStart = (mediumEnd + ARC_GAP_DEG) % 360;
  const hardEnd = (hardStart + ARC_SPAN_DEG) % 360;
  return {
    Easy: { start: easyStart, end: easyEnd },
    Medium: { start: mediumStart, end: mediumEnd },
    Hard: { start: hardStart, end: hardEnd },
  };
})();

function useCountUp(target: number, duration = 700, decimals = 0, active = true): number | string {
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
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value);
}

function arcSpanDeg(start: number, end: number): number {
  return end >= start ? end - start : end + 360 - start;
}

function polarToXY(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function describeArc(startDeg: number, endDeg: number, r: number): string {
  const span = arcSpanDeg(startDeg, endDeg);
  const start = polarToXY(startDeg, r);
  const end = polarToXY(endDeg, r);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function arcLength(r: number, spanDeg: number): number {
  return (spanDeg / 360) * 2 * Math.PI * r;
}

interface ArcTooltip {
  difficulty: Difficulty;
  solved: number;
  bucketTotal: number;
  rect: DOMRect;
}

function ArcTooltipPortal({ difficulty, solved, bucketTotal, rect }: ArcTooltip) {
  if (typeof document === "undefined" || !document.body) return null;
  const style = DIFFICULTY_STYLE[difficulty];
  const pct = bucketTotal > 0 ? ((solved / bucketTotal) * 100).toFixed(1) : "0.0";

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 min-w-[9rem] rounded-xl border border-border/40 bg-card px-4 py-3 shadow-[0_8px_30px_rgba(34,52,26,0.12)]"
      style={{
        left: rect.left + rect.width / 2,
        top: rect.top - 10,
        transform: "translate(-50%, -100%)",
      }}
      role="tooltip"
    >
      <p className="text-sm font-semibold" style={{ color: style.solved }}>
        {style.label}
      </p>
      <p className="mt-1 text-sm text-foreground">
        <span className="font-bold tabular-nums">{solved}</span>
        <span className="text-muted-foreground"> / {bucketTotal} solved</span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{pct}%</p>
    </div>,
    document.body
  );
}

function DifficultyArc({
  difficulty,
  solved,
  bucketTotal,
  animate,
  hovered,
  onHover,
  onLeave,
}: {
  difficulty: Difficulty;
  solved: number;
  bucketTotal: number;
  animate: boolean;
  hovered: boolean;
  onHover: (el: SVGGElement) => void;
  onLeave: () => void;
}) {
  const { start, end } = ARC_ANGLES[difficulty];
  const style = DIFFICULTY_STYLE[difficulty];
  const path = describeArc(start, end, RADIUS);
  const span = arcSpanDeg(start, end);
  const fullLen = arcLength(RADIUS, span);
  const pct = bucketTotal > 0 ? solved / bucketTotal : 0;
  const solvedLen = fullLen * pct;
  const strokeW = hovered ? STROKE + 2 : STROKE;

  return (
    <g
      className="cursor-pointer"
      onMouseEnter={(e) => onHover(e.currentTarget)}
      onMouseLeave={onLeave}
    >
      <path
        d={path}
        fill="none"
        stroke={style.remaining}
        strokeWidth={strokeW}
        strokeLinecap="round"
        style={{ transition: "stroke-width 200ms ease-out" }}
      />
      <path
        data-arc="solved"
        d={path}
        fill="none"
        stroke={style.solved}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={animate ? `${solvedLen} ${fullLen - solvedLen}` : `0 ${fullLen}`}
        style={{
          transition: "stroke-dasharray 700ms cubic-bezier(0, 0, 0.2, 1), stroke-width 200ms ease-out, filter 200ms",
          filter: hovered ? `drop-shadow(0 0 6px ${style.solved}88)` : undefined,
        }}
      />
    </g>
  );
}

function TripleArcChart({
  solvedTotal,
  total,
  attempting,
  byDifficulty,
  animate,
}: {
  solvedTotal: number;
  total: number;
  attempting: number;
  byDifficulty: Record<Difficulty, DifficultyStats>;
  animate: boolean;
}) {
  const [hovered, setHovered] = useState<Difficulty | null>(null);
  const [tooltip, setTooltip] = useState<ArcTooltip | null>(null);
  const animatedSolved = useCountUp(solvedTotal, 700, 0, animate) as number;
  const animatedAttempting = useCountUp(attempting, 700, 0, animate) as number;

  const handleHover = useCallback(
    (difficulty: Difficulty, el: SVGGElement) => {
      setHovered(difficulty);
      setTooltip({
        difficulty,
        solved: byDifficulty[difficulty].solved,
        bucketTotal: byDifficulty[difficulty].total,
        rect: el.getBoundingClientRect(),
      });
    },
    [byDifficulty]
  );

  const handleLeave = useCallback(() => {
    setHovered(null);
    setTooltip(null);
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="block overflow-visible"
        aria-hidden
      >
        {ORDER.map((d) => (
          <DifficultyArc
            key={d}
            difficulty={d}
            solved={byDifficulty[d].solved}
            bucketTotal={byDifficulty[d].total}
            animate={animate}
            hovered={hovered === d}
            onHover={(el) => handleHover(d, el)}
            onLeave={handleLeave}
          />
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="leading-none tabular-nums">
          <span className="text-[3.125rem] font-bold tracking-tight text-foreground sm:text-[3.5rem]">
            {animatedSolved}
          </span>
          <span className="text-xl font-normal text-muted-foreground sm:text-2xl">/{total}</span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#2F7D4F]">
          <CheckCircle2 className="size-4" strokeWidth={2.25} />
          Solved
        </p>
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">{animatedAttempting}</span> Attempting
        </p>
      </div>

      {tooltip && <ArcTooltipPortal {...tooltip} />}
    </div>
  );
}

function DifficultyRow({
  difficulty,
  solved,
  bucketTotal,
  animate,
  delayMs,
}: {
  difficulty: Difficulty;
  solved: number;
  bucketTotal: number;
  animate: boolean;
  delayMs: number;
}) {
  const style = DIFFICULTY_STYLE[difficulty];
  const pct = bucketTotal > 0 ? (solved / bucketTotal) * 100 : 0;
  const animatedSolved = useCountUp(solved, 700, 0, animate) as number;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium" style={{ color: style.solved }}>
          {style.label}
        </span>
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {animatedSolved}
          <span className="text-base font-normal text-muted-foreground">/{bucketTotal}</span>
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: style.remaining }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: animate ? `${pct}%` : "0%",
            backgroundColor: style.solved,
            transition: "width 700ms cubic-bezier(0, 0, 0.2, 1)",
            transitionDelay: `${delayMs}ms`,
          }}
        />
      </div>
    </div>
  );
}

function CompetitionRow({
  item,
  animate,
  delayMs,
}: {
  item: CompetitionStats;
  animate: boolean;
  delayMs: number;
}) {
  const colors = COMPETITION_STYLE[item.key] ?? COMPETITION_STYLE.Other;
  const pct = item.total > 0 ? (item.solved / item.total) * 100 : 0;
  const animatedSolved = useCountUp(item.solved, 700, 0, animate) as number;
  const animatedPct = useCountUp(pct, 700, 1, animate);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{item.key}</span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {animatedSolved}
          <span className="text-sm font-normal text-muted-foreground">/{item.total}</span>
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: colors.remaining }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: animate ? `${pct}%` : "0%",
            backgroundColor: colors.solved,
            transition: "width 700ms cubic-bezier(0, 0, 0.2, 1)",
            transitionDelay: `${delayMs}ms`,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">{animatedPct}% complete</p>
    </div>
  );
}

export function SolvedStatsCard({
  solvedTotal,
  total,
  attempting,
  byDifficulty,
  byCompetition,
}: SolvedStatsCardProps) {
  const [animate, setAnimate] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-2xl border border-border/60 bg-card px-6 py-8 sm:px-8 sm:py-10",
        "shadow-[0_1px_3px_rgba(34,52,26,0.06),0_8px_24px_rgba(34,52,26,0.04)]",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(34,52,26,0.08),0_16px_40px_rgba(34,52,26,0.06)]"
      )}
    >
      <h2 className="text-section-header mb-6">Progress</h2>
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-0">
        {/* 65% — triple arc + difficulty rows */}
        <div className="flex min-w-0 flex-[65] flex-col gap-8 sm:flex-row sm:items-center lg:pr-8">
          <div className="flex shrink-0 justify-center sm:w-[45%]">
            <TripleArcChart
              solvedTotal={solvedTotal}
              total={total}
              attempting={attempting}
              byDifficulty={byDifficulty}
              animate={animate}
            />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-6 sm:w-[55%]">
            {ORDER.map((d, i) => (
              <DifficultyRow
                key={d}
                difficulty={d}
                solved={byDifficulty[d].solved}
                bucketTotal={byDifficulty[d].total}
                animate={animate}
                delayMs={100 + i * 80}
              />
            ))}
          </div>
        </div>

        <div className="hidden w-px shrink-0 self-stretch bg-border/70 lg:block" />
        <div className="h-px w-full shrink-0 bg-border/70 lg:hidden" />

        {/* 35% — AMC 10 / AMC 12 / Other */}
        <div className="flex min-w-0 flex-[35] flex-col justify-center gap-6 lg:pl-8">
          {byCompetition.map((item, i) => (
            <CompetitionRow key={item.key} item={item} animate={animate} delayMs={150 + i * 80} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use SolvedStatsCard */
export { SolvedStatsCard as SolvedDifficultyRing };
