"use client";

import { LatexText } from "@/components/LatexText";
import type { AnswerVerdict } from "@/lib/checkAnswer";
import { cn } from "@/lib/utils";

const VERDICT_LABELS: Record<AnswerVerdict, string> = {
  correct: "Correct",
  partial: "Partially correct",
  incorrect: "Not quite right",
};

const VERDICT_STYLES: Record<AnswerVerdict, string> = {
  correct: "border-green-300 bg-green-100 text-green-900",
  partial: "border-amber-300 bg-amber-100 text-amber-900",
  incorrect: "border-red-300 bg-red-100 text-red-900",
};

interface InlineAnswerFeedbackProps {
  verdict: AnswerVerdict;
  analysis: string;
}

export function InlineAnswerFeedback({ verdict, analysis }: InlineAnswerFeedbackProps) {
  return (
    <div className={cn("mt-3 rounded-md border p-4 space-y-2", VERDICT_STYLES[verdict])}>
      <p className="text-meta normal-case tracking-normal">{VERDICT_LABELS[verdict]}</p>
      <div className="text-sm leading-relaxed">
        <LatexText block>{analysis}</LatexText>
      </div>
    </div>
  );
}
