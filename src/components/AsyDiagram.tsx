"use client";

import { useMemo } from "react";
import { asyToSvg } from "@/lib/asyToSvg";

interface AsyDiagramProps {
  source: string;
  className?: string;
}

/** Lightweight Asymptote → SVG (no TikZJax / WASM). */
export function AsyDiagram({ source, className = "" }: AsyDiagramProps) {
  const result = useMemo(() => asyToSvg(source), [source]);
  if (!result.ok) return null;

  return (
    <div
      className={`mx-auto my-3 max-w-[280px] bg-transparent ${className}`}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  );
}
