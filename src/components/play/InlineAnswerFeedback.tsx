"use client";

import { LatexText } from "@/components/LatexText";
import type { AnswerVerdict } from "@/lib/checkAnswer";

const VERDICT_LABELS: Record<AnswerVerdict, string> = {
  correct: "Correct",
  partial: "Partially correct",
  incorrect: "Not quite right",
};

const VERDICT_STYLES: Record<AnswerVerdict, string> = {
  correct: "border-green-700 bg-green-100 text-green-900",
  partial: "border-amber-700 bg-amber-100 text-amber-900",
  incorrect: "border-red-700 bg-red-100 text-red-900",
};

interface InlineAnswerFeedbackProps {
  verdict: AnswerVerdict;
  analysis: string;
  gameStyle?: boolean;
}

export function InlineAnswerFeedback({
  verdict,
  analysis,
  gameStyle = false,
}: InlineAnswerFeedbackProps) {
  const borderClass = gameStyle
    ? "border-[3px] border-[var(--game-forest)] bg-[var(--game-cream)]"
    : `border-2 ${VERDICT_STYLES[verdict]}`;

  return (
    <div className={`mt-3 rounded-xl p-4 space-y-2 ${borderClass}`}>
      <p
        className={`text-sm font-bold uppercase tracking-wide ${
          gameStyle ? "text-[var(--game-forest)]" : ""
        }`}
      >
        {VERDICT_LABELS[verdict]}
      </p>
      <div
        className={`text-sm font-semibold leading-relaxed ${
          gameStyle ? "text-[var(--game-forest)]" : ""
        }`}
      >
        <LatexText block>{analysis}</LatexText>
      </div>
    </div>
  );
}
