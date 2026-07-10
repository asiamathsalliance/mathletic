"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const REEL_EASE = { x1: 0.15, y1: 0.85, x2: 0.3, y2: 1 };

function cubicBezier(t: number, p1: number, p2: number, p3: number, p4: number): number {
  const u = 1 - t;
  return u * u * u * p1 + 3 * u * u * t * p2 + 3 * u * t * t * p3 + t * t * t * p4;
}

function reelEase(progress: number): number {
  return cubicBezier(progress, 0, REEL_EASE.y1, REEL_EASE.y2, 1);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function reelDisplayValue(progress: number, target: number, frame: number): number {
  if (progress >= 1) return target;

  const eased = reelEase(progress);
  const ceiling = Math.max(target + 12, 24, Math.ceil(target * 1.6));

  if (eased >= 0.92) return target;

  if (eased >= 0.78) {
    const wobble = Math.floor(pseudoRandom(frame + target) * 3) - 1;
    const near = target + wobble;
    if (Math.abs(near - target) <= 2) return near;
    return target;
  }

  const slot = Math.floor(eased * 28 + frame * 0.35);
  return Math.floor(pseudoRandom(slot + target * 0.17) * ceiling);
}

export function SlotReelNumber({
  value,
  active = true,
  delayMs = 0,
  durationMs = 900,
  suffix = "",
  className,
  onSettled,
}: {
  value: number;
  active?: boolean;
  delayMs?: number;
  durationMs?: number;
  suffix?: string;
  className?: string;
  onSettled?: () => void;
}) {
  const [display, setDisplay] = useState(0);
  const targetRef = useRef(value);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    targetRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!active) {
      setDisplay(0);
      settledRef.current = false;
      return;
    }

    settledRef.current = false;

    let raf = 0;
    let frame = 0;
    const startAt = performance.now() + delayMs;

    const tick = (now: number) => {
      const elapsed = now - startAt;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(1, elapsed / durationMs);
      frame += 1;
      const target = targetRef.current;

      if (progress >= 1) {
        setDisplay(target);
        if (!settledRef.current) {
          settledRef.current = true;
          onSettledRef.current?.();
        }
        return;
      }

      setDisplay(reelDisplayValue(progress, target, frame));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, delayMs, durationMs]);

  return (
    <span className={cn("tabular-nums", className)}>
      {display}
      {suffix}
    </span>
  );
}
