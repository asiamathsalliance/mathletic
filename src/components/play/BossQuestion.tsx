"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LatexText } from "@/components/LatexText";
import type { ClientBossQuestion } from "@/lib/playSessionToken";
import type { BossSelfMark } from "@/lib/playConfig";
import { checkAnswerWithLocalModel, type AnswerVerdict } from "@/lib/checkAnswer";
import { InlineAnswerFeedback } from "@/components/play/InlineAnswerFeedback";
import { AiUnavailableModal } from "@/components/AiUnavailableModal";
import { isAiUnavailableError } from "@/lib/aiErrors";
import { GameCard } from "./GameCard";
import { GameButton } from "./GameButton";
import { CountdownRing } from "./CountdownRing";

interface BossQuestionProps {
  question: ClientBossQuestion;
  token: string;
  onComplete: (result: {
    token: string;
    mcqScore: number;
    bossScore: number;
    bossTimeBonus: number;
    totalXp: number;
    maxCombo: number;
    mcqCorrect: number;
    mcqTotal: number;
    accuracy: number;
    totalTimeMs: number;
    bossCorrect: boolean;
    category: string;
  }) => void;
}

export function BossQuestion({ question, token, onComplete }: BossQuestionProps) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimitMs);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scoreLocked, setScoreLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showAiUnavailable, setShowAiUnavailable] = useState(false);

  const imagePath =
    question.image && question.image !== "none" ? question.image : question.questionImage;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [question.id]);

  const handleCheckAnswer = async () => {
    if (!answer.trim() || checking) return;
    setChecking(true);
    setCheckError(null);
    setVerdict(null);
    setAnalysis(null);
    try {
      const result = await checkAnswerWithLocalModel(question.questionText, answer, {
        curriculum: question.curriculum,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        examSource: question.examSource,
      });
      setVerdict(result.verdict);
      setAnalysis(result.analysis);
    } catch (err) {
      if (isAiUnavailableError(err)) {
        setShowAiUnavailable(true);
        setCheckError(null);
      } else {
        setCheckError(err instanceof Error ? err.message : "Could not check answer.");
      }
    } finally {
      setChecking(false);
    }
  };

  const submitBoss = async (selfMark: BossSelfMark) => {
    if (submitting) return;
    setSubmitting(true);
    setScoreLocked(true);
    try {
      const res = await fetch("/api/play/boss-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, selfMark }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      onComplete(data);
    } catch {
      setSubmitting(false);
      setScoreLocked(false);
    }
  };

  return (
    <>
    <GameCard accent className="space-y-5 play-card-head">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[var(--game-forest)] font-[family-name:var(--font-game-heading)]">
          Boss Check
        </h2>
        <CountdownRing timeLeftMs={timeLeft} timeLimitMs={question.timeLimitMs} size={80} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm font-bold">
        <span className="rounded-full border-2 border-[var(--game-forest)] px-3 py-1 bg-[var(--game-cream)]">
          {question.difficulty}
        </span>
        <span className="rounded-full border-2 border-[var(--game-forest)] px-3 py-1 bg-[var(--game-cream)]">
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

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Write your working and answer here..."
        rows={6}
        disabled={scoreLocked}
        className="w-full rounded-2xl border-[3px] border-[var(--game-forest)] bg-[var(--game-cream)] p-4 font-semibold text-[var(--game-forest)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--game-forest)]"
      />

      <GameButton
        variant="secondary"
        className="w-full"
        disabled={!answer.trim() || checking || scoreLocked}
        onClick={handleCheckAnswer}
      >
        {checking ? "Checking..." : "Check answer"}
      </GameButton>

      {checkError && <p className="text-sm font-bold text-red-700">{checkError}</p>}
      {verdict && (
        <InlineAnswerFeedback
          verdict={verdict}
          analysis={analysis || "Answer checked."}
          gameStyle
        />
      )}

      <p className="text-sm font-bold text-[var(--game-forest)]">
        Self-mark against the markscheme (honor system). Score is locked when you submit.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GameButton variant="secondary" disabled={submitting || scoreLocked} onClick={() => submitBoss("incorrect")}>
          Incorrect
        </GameButton>
        <GameButton variant="sage" disabled={submitting || scoreLocked} onClick={() => submitBoss("partial")}>
          Partial
        </GameButton>
        <GameButton disabled={submitting || scoreLocked} onClick={() => submitBoss("correct")}>
          Correct
        </GameButton>
      </div>
    </GameCard>
    <AiUnavailableModal
      open={showAiUnavailable}
      onClose={() => setShowAiUnavailable(false)}
    />
  </>
  );
}
