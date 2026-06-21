"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LatexText } from "@/components/LatexText";
import type { ClientMcqQuestion } from "@/lib/playSessionToken";
import { GameCard } from "./GameCard";
import { GameButton } from "./GameButton";
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

  return (
    <GameCard
      className={`relative space-y-5 play-card-head ${feedback === "correct" ? "game-pop" : feedback === "wrong" ? "game-shake" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-bold text-[var(--game-forest)]">
          Speed round {question.questionIndex + 1} / {question.totalMcq}
        </div>
        <div className="flex items-center gap-3">
          <ComboCounter combo={combo} milestone={milestone} />
          <CountdownRing timeLeftMs={timeLeft} timeLimitMs={question.timeLimitMs} />
        </div>
      </div>

      {pointsPopup != null && (
        <div className="absolute top-16 right-6 points-popup font-bold text-xl text-[var(--game-forest)]">
          +{pointsPopup}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm font-bold">
        <span className="rounded-full border-2 border-[var(--game-forest)] px-3 py-1 bg-[var(--game-sage)]">
          {question.difficulty}
        </span>
        <span className="rounded-full border-2 border-[var(--game-forest)] px-3 py-1">
          {question.topic}
        </span>
      </div>

      <div className="text-lg font-semibold text-[var(--game-forest)]">
        <LatexText>{question.questionText}</LatexText>
      </div>

      {imagePath && (
        <div className="relative w-full max-w-md aspect-video rounded-xl border-[3px] border-[var(--game-forest)] overflow-hidden">
          <Image src={imagePath} alt="Question diagram" fill className="object-contain" />
        </div>
      )}

      <div className="play-mcq-section border-t-[3px] border-[var(--game-forest)]/20 grid gap-3">
        {question.choices.map((choice, i) => (
          <GameButton
            key={i}
            variant={selected === i ? "sage" : "secondary"}
            className="w-full justify-start text-left h-auto min-h-[48px] whitespace-normal"
            disabled={submitting}
            onClick={() => handleSelect(i)}
          >
            <LatexText>{choice}</LatexText>
          </GameButton>
        ))}
      </div>
    </GameCard>
  );
}
