import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface GameCardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
}

export function GameCard({ className, accent, children, ...props }: GameCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-[3px] border-[var(--game-forest)] game-shadow p-5 md:p-6",
        accent ? "bg-[var(--game-sage)]" : "bg-[var(--game-cream)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
