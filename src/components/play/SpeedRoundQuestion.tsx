"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LatexText } from "@/components/LatexText";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ClientMcqQuestion } from "@/lib/playSessionToken";
import { cn } from "@/lib/utils";
import { CountdownRing } from "./CountdownRing";
import { ComboCounter } from "./ComboCounter";

interface SpeedRoundQuestionProps {
  question: ClientMcqQuestion;
  combo: number;
  token: string;
  onAnswered: (result: {
    token: string;
    pointsEarned: number;
    combo: number;
    maxCombo: number;
    correct: boolean;
    timedOut: boolean;
    phase: "mcq" | "boss";
    nextQuestion?: ClientMcqQuestion;
    bossQuestion?: import("@/lib/playSessionToken").ClientBossQuestion;
  }) => void;
}

export function SpeedRoundQuestion({ question, combo, token, onAnswered }: SpeedRoundQuestionProps) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimitMs);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [pointsPopup, setPointsPopup] = useState<number | null>(null);
  const [milestone, setMilestone] = useState(false);
  const submittedRef = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const imagePath =
    question.image && question.image !== "none" ? question.image : question.questionImage;

  const submitAnswer = useCallback(
    async (choiceIndex: number, timedOut = false) => {
      if (submittedRef.current || submitting) return;
      submittedRef.current = true;
      setSubmitting(true);

      try {
        const res = await fetch("/api/play/mcq-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenRef.current, choiceIndex }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error);

        setFeedback(data.correct && !data.timedOut ? "correct" : "wrong");
        if (data.pointsEarned > 0) {
          setPointsPopup(data.pointsEarned);
          if (data.combo >= 1.5) setMilestone(true);
        }

        setTimeout(() => {
          onAnswered(data);
        }, 700);
      } catch {
        submittedRef.current = false;
        setSubmitting(false);
      }
    },
    [submitting, onAnswered]
  );

  useEffect(() => {
    submittedRef.current = false;
    setTimeLeft(question.timeLimitMs);
    setSelected(null);
    setFeedback(null);
    setPointsPopup(null);
    setMilestone(false);
    setSubmitting(false);
  }, [question.id, question.timeLimitMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 100;
        if (next <= 0 && !submittedRef.current) {
          submitAnswer(selected ?? -1, true);
          return 0;
        }
        return Math.max(0, next);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [question.id, selected, submitAnswer]);

  const handleSelect = (index: number) => {
    if (submittedRef.current || submitting) return;
    setSelected(index);
    submitAnswer(index);
  };

  const choiceClass = (index: number) => {
    if (selected !== index || !feedback) {
      return "border-border hover:bg-muted/60";
    }
    return feedback === "correct"
      ? "border-green-600 bg-green-100 text-green-900"
      : "border-red-600 bg-red-100 text-red-900";
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Speed round {question.questionIndex + 1} / {question.totalMcq}
          </p>
          <div className="flex items-center gap-3">
            <ComboCounter combo={combo} milestone={milestone} />
            <CountdownRing timeLeftMs={timeLeft} timeLimitMs={question.timeLimitMs} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {pointsPopup != null && (
          <div className="absolute top-16 right-6 text-lg font-semibold text-green-700">
            +{pointsPopup}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="text-meta rounded-md border border-border px-2 py-1">{question.topic}</span>
        </div>

        <div className="text-sm leading-relaxed">
          <LatexText>{question.questionText}</LatexText>
        </div>

        {imagePath && (
          <div className="relative w-full max-w-md aspect-video rounded-md border border-border overflow-hidden">
            <Image src={imagePath} alt="Question diagram" fill className="object-contain" />
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          {question.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "w-full flex items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors",
                choiceClass(i),
                feedback && "pointer-events-none"
              )}
              disabled={submitting && !feedback}
              onClick={() => handleSelect(i)}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 min-w-0">
                <LatexText>{choice}</LatexText>
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
