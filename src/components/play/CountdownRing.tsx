"use client";

interface CountdownRingProps {
  timeLeftMs: number;
  timeLimitMs: number;
  size?: number;
}

export function CountdownRing({ timeLeftMs, timeLimitMs, size = 72 }: CountdownRingProps) {
  const ratio = Math.max(0, Math.min(1, timeLeftMs / timeLimitMs));
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const urgent = ratio < 0.25;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? "var(--destructive)" : "var(--primary)"}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-100 linear"
        />
      </svg>
      <span
        className={`absolute text-sm font-medium tabular-nums ${
          urgent ? "text-destructive" : "text-foreground"
        }`}
      >
        {Math.ceil(timeLeftMs / 1000)}
      </span>
    </div>
  );
}
