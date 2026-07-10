"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { LatexText } from "@/components/LatexText";
import type { SprintQuestion } from "@/lib/sprint";
import { cn } from "@/lib/utils";

const MIN_FEEDBACK_MS = 200;
const ADVANCE_EXTRA_MS = 80;

export function ProblemPlay({
  sessionId,
  initialQuestion,
  onAnswered,
  onTimeUp,
  onPoolExhausted,
  frozen,
}: {
  sessionId: string;
  initialQuestion: SprintQuestion;
  onAnswered: (result: { correct: boolean; points: number }) => void;
  onTimeUp?: () => void;
  onPoolExhausted?: () => void;
  frozen: boolean;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    correctIndex: number;
    points: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shownAt = useRef(Date.now());

  const answer = useCallback(
    async (index: number) => {
      if (submitting || frozen || feedback) return;
      setSubmitting(true);
      setSelected(index);
      const feedbackStartedAt = Date.now();
      const timeTakenSeconds = (Date.now() - shownAt.current) / 1000;

      try {
        const res = await fetch("/api/sprint/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId: question.id,
            answerIndex: index,
            timeTakenSeconds,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.timeUp) {
            onTimeUp?.();
            return;
          }
          setSubmitting(false);
          setSelected(null);
          return;
        }

        setFeedback({
          correct: data.correct,
          correctIndex: data.correctIndex,
          points: data.points,
        });
        onAnswered({ correct: data.correct, points: data.points });

        const waitMs = Math.max(0, MIN_FEEDBACK_MS + ADVANCE_EXTRA_MS - (Date.now() - feedbackStartedAt));
        setTimeout(() => {
          setFeedback(null);
          setSelected(null);
          if (data.question) {
            setQuestion(data.question);
            shownAt.current = Date.now();
            setSubmitting(false);
          } else {
            onPoolExhausted?.();
          }
        }, waitMs);
      } catch {
        setSubmitting(false);
        setSelected(null);
      }
    },
    [submitting, frozen, feedback, sessionId, question, onAnswered, onTimeUp, onPoolExhausted]
  );

  useEffect(() => {
    shownAt.current = Date.now();
  }, [question.id]);

  const q = question;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-10">
      <div
        className={cn(
          "rounded-xl border bg-card p-6 space-y-5 transition-colors duration-200",
          feedback?.correct && "border-[#2F7D4F] bg-[#2F7D4F]/5",
          feedback && !feedback.correct && "border-[#C94A3D] bg-[#C94A3D]/5",
          !feedback && "border-border"
        )}
      >
        {q.imageUrl && (
          <div className="relative min-h-[180px] w-full overflow-hidden rounded-md border border-border bg-muted/30">
            <Image
              src={q.imageUrl}
              alt="Question diagram"
              fill
              className="object-contain p-2"
              sizes="700px"
              unoptimized={q.imageUrl.startsWith("http")}
            />
          </div>
        )}

        <div className="text-base leading-relaxed">
          <LatexText block>{q.questionText}</LatexText>
        </div>

        <div className="flex flex-col gap-2">
          {q.choices.map((choice, index) => {
            const chosen = selected === index;
            const showCorrect = feedback !== null && index === feedback.correctIndex;
            const showWrong = feedback !== null && chosen && !feedback.correct;
            return (
              <button
                key={index}
                type="button"
                disabled={feedback !== null || frozen || submitting}
                onClick={() => answer(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors",
                  showCorrect && "border-l-4 border-l-[#2F7D4F] bg-[#2F7D4F]/10 border-border",
                  showWrong && "border-l-4 border-l-[#C94A3D] bg-[#C94A3D]/10 border-border",
                  !showCorrect && !showWrong && "border-border hover:bg-muted/50"
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <LatexText>{choice}</LatexText>
                </span>
                {showCorrect && <Check className="size-4 shrink-0 text-[#24603D]" />}
                {showWrong && <X className="size-4 shrink-0 text-[#A03328]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
