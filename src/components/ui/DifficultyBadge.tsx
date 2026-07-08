import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/question";

const styles: Record<Difficulty, string> = {
  Easy: "bg-[#2F7D4F]/10 text-[#24603D] border-[#2F7D4F]/30",
  Medium: "bg-[#B8D444]/25 text-[#55661A] border-[#8FA82F]/50",
  Hard: "bg-[#C94A3D]/10 text-[#A03328] border-[#C94A3D]/30",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border",
        styles[difficulty],
        className
      )}
    >
      {difficulty}
    </span>
  );
}
