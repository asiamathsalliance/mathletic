"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import type { MultiplicationProblem } from "@/lib/sprint";
import { cn } from "@/lib/utils";

const MIN_FEEDBACK_MS = 200;
const CORRECT_EXTRA_MS = 60;
const WRONG_EXTRA_MS = 40;
const MAX_DIGITS = 4;

function sanitizeNumericInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

export function MultiplicationPlay({
  sessionId,
  initialProblem,
  onAnswered,
  onTimeUp,
  frozen,
}: {
  sessionId: string;
  initialProblem: MultiplicationProblem;
  onAnswered: (result: {
    correct: boolean;
    points: number;
    currentStreak: number;
  }) => void;
  onTimeUp?: () => void;
  frozen: boolean;
}) {
  const [problem, setProblem] = useState(initialProblem);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [animTick, setAnimTick] = useState(0);
  const shownAt = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [problem]);

  const submit = useCallback(
    async (value: number) => {
      if (submitting || frozen || feedback) return;
      setSubmitting(true);
      const timeTakenSeconds = (Date.now() - shownAt.current) / 1000;
      const locallyCorrect = problem.operandA * problem.operandB === value;
      const feedbackStartedAt = Date.now();
      setAnimTick((t) => t + 1);
      setFeedback(locallyCorrect ? "correct" : "wrong");

      const advanceAfterFeedback = (
        wasCorrect: boolean,
        nextProblem: MultiplicationProblem,
        apiStreak: number,
        points: number
      ) => {
        const minHold = wasCorrect ? MIN_FEEDBACK_MS + CORRECT_EXTRA_MS : MIN_FEEDBACK_MS + WRONG_EXTRA_MS;
        const waitMs = Math.max(0, minHold - (Date.now() - feedbackStartedAt));
        setTimeout(() => {
          setFeedback(null);
          setInput("");
          setProblem(nextProblem);
          shownAt.current = Date.now();
          setSubmitting(false);
          inputRef.current?.focus();
        }, waitMs);
        setStreak(apiStreak);
        onAnswered({
          correct: wasCorrect,
          points,
          currentStreak: apiStreak,
        });
      };

      try {
        const res = await fetch("/api/sprint/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            operandA: problem.operandA,
            operandB: problem.operandB,
            userAnswerValue: value,
            timeTakenSeconds,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.timeUp) {
            onTimeUp?.();
            return;
          }
          setFeedback(null);
          setSubmitting(false);
          return;
        }

        const wasCorrect = data.correct as boolean;
        if (wasCorrect !== locallyCorrect) {
          setAnimTick((t) => t + 1);
          setFeedback(wasCorrect ? "correct" : "wrong");
        }

        advanceAfterFeedback(
          wasCorrect,
          data.nextProblem as MultiplicationProblem,
          data.currentStreak ?? 0,
          data.points
        );
      } catch {
        setFeedback(null);
        setSubmitting(false);
      }
    },
    [submitting, frozen, feedback, sessionId, problem, onAnswered, onTimeUp]
  );

  const trySubmit = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === "") return;
      void submit(parseInt(trimmed, 10));
    },
    [submit]
  );

  const handleDigit = (digit: string) => {
    if (frozen || feedback || submitting) return;
    if (digit === "clear") {
      setInput("");
      inputRef.current?.focus();
      return;
    }
    if (digit === "submit") {
      trySubmit(input);
      return;
    }
    const next = sanitizeNumericInput(input + digit);
    setInput(next);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (frozen || feedback || submitting) return;
    setInput(sanitizeNumericInput(e.target.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (frozen || feedback || submitting) return;
    if (e.key === "Enter") {
      e.preventDefault();
      trySubmit(input);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
    }
  };

  const disabled = frozen || !!feedback || submitting;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="relative">
        {streak >= 2 && (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-[#C9941F]/30 bg-card px-3 py-1 text-sm font-semibold text-[#C9941F] shadow-sm">
            <Flame className="size-4" />
            {streak} streak
          </div>
        )}

        <div
          className={cn(
            "sprint-mult-card relative overflow-visible rounded-2xl border border-border bg-card px-4 py-8 text-center shadow-sm",
            feedback === "correct" && "sprint-flash-correct"
          )}
        >
        {feedback === "correct" && (
          <div className="sprint-particles pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" />
        )}

        <div
          key={animTick}
          className={cn(
            feedback === "correct" && "sprint-bounce-correct",
            feedback === "wrong" && "sprint-shake-wrong"
          )}
        >
          <p className="text-5xl font-bold tracking-tight tabular-nums">
            {problem.operandA}
            <span className="mx-2 text-[#8FA82F]">×</span>
            {problem.operandB}
          </p>
          <div className="mt-6 border-t border-border pt-5">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Answer"
              className={cn(
                "w-full bg-transparent text-center text-4xl font-bold tabular-nums outline-none placeholder:text-xl placeholder:font-normal placeholder:text-muted-foreground",
                feedback === "correct" && "text-[#2F7D4F]",
                feedback === "wrong" && "text-[#C94A3D]"
              )}
              disabled={disabled}
              aria-label={`Answer for ${problem.operandA} times ${problem.operandB}`}
            />
          </div>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "submit"].map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(key)}
            className={cn(
              "rounded-xl border border-border py-4 text-lg font-semibold transition-colors",
              key === "submit"
                ? "col-span-1 bg-[#1C4B3B] text-white hover:bg-[#163d30] disabled:opacity-50"
                : key === "clear"
                  ? "text-muted-foreground hover:bg-muted/50"
                  : "hover:bg-muted/50"
            )}
          >
            {key === "submit" ? "Go" : key === "clear" ? "⌫" : key}
          </button>
        ))}
      </div>
    </div>
  );
}
