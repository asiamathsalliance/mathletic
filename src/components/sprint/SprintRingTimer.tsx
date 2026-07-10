"use client";

import { useEffect, useRef, useState } from "react";
import {
  sprintTimerStrokeColor,
  sprintTimerUrgent,
} from "@/lib/sprint";
import { cn } from "@/lib/utils";

const SIZE = 56;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function SprintRingTimer({
  endsAt,
  durationSeconds,
  onTimeUp,
}: {
  endsAt: number;
  durationSeconds: number;
  onTimeUp: () => void;
}) {
  const [fraction, setFraction] = useState(1);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    let raf = 0;

    const tick = () => {
      const remainingMs = Math.max(0, endsAt - Date.now());
      const secs = remainingMs / 1000;
      setFraction(secs / durationSeconds);
      setTimeLeft(Math.ceil(secs));
      if (secs <= 0 && !fired.current) {
        fired.current = true;
        onTimeUp();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endsAt, durationSeconds, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const strokeColor = sprintTimerStrokeColor(timeLeft, durationSeconds);
  const urgent = sprintTimerUrgent(timeLeft, durationSeconds);
  const offset = CIRCUMFERENCE * (1 - fraction);

  return (
    <div
      className={cn("relative shrink-0", urgent && "sprint-timer-urgent")}
      style={{ width: SIZE, height: SIZE }}
      aria-label={`${minutes}:${String(seconds).padStart(2, "0")} remaining`}
    >
      <svg width={SIZE} height={SIZE} className="block">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="transition-[stroke] duration-300"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "font-mono text-[11px] font-semibold tabular-nums leading-none",
            urgent ? "text-[#C94A3D]" : "text-foreground"
          )}
        >
          {minutes}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
