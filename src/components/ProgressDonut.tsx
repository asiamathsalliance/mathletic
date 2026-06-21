"use client";

import React from "react";

interface ProgressDonutProps {
  total: number;
  solved: number;
}

export function ProgressDonut({ total, solved }: ProgressDonutProps) {
  const radius = 60;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = total > 0 ? Math.min(1, solved / total) : 0;
  const strokeDashoffset = circumference - progress * circumference;
  const percentLabel = total > 0 ? Math.round(progress * 100) : 0;

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-44 h-44">
        <svg
          height="100%"
          width="100%"
          viewBox={`0 0 ${radius * 2} ${radius * 2}`}
          className="block"
        >
          <g className="text-muted-foreground/30">
            <circle
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </g>
          <g className="text-primary">
            <circle
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
              transform={`rotate(-90 ${radius} ${radius})`}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-sm text-muted-foreground">Solved</div>
          <div className="text-lg font-semibold">
            {solved}/{total}
          </div>
          <div className="text-xs text-muted-foreground">{percentLabel}%</div>
        </div>
      </div>
    </div>
  );
}
