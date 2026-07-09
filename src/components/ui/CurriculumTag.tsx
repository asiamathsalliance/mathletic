import { cn } from "@/lib/utils";
import type { Curriculum, CurriculumLabel } from "@/types/question";

const styles: Record<CurriculumLabel, string> = {
  HSC: "bg-[#2F7D4F]/10 text-[#24603D] border-[#2F7D4F]/30",
  IB: "bg-[#F7C548]/20 text-[#8A6410] border-[#C9941F]/40",
  AP: "bg-[#2E6DA4]/10 text-[#235682] border-[#2E6DA4]/30",
  "A-Level": "bg-[#B8D444]/25 text-[#55661A] border-[#8FA82F]/50",
  "AMC 10": "bg-[#7B4FA6]/10 text-[#5D3A80] border-[#7B4FA6]/30",
  "AMC 12": "bg-[#A6524F]/10 text-[#803D3A] border-[#A6524F]/30",
};

export function CurriculumTag({
  curriculum,
  className,
}: {
  curriculum: Curriculum | string;
  className?: string;
}) {
  const style =
    styles[curriculum as CurriculumLabel] ??
    "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border",
        style,
        className
      )}
    >
      {curriculum}
    </span>
  );
}
