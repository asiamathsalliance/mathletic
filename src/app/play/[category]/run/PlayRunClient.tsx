"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeedRoundQuestion } from "@/components/play/SpeedRoundQuestion";
import { BossQuestion } from "@/components/play/BossQuestion";
import { SessionResults, type SessionResultsData } from "@/components/play/SessionResults";
import { GameCard } from "@/components/play/GameCard";
import { GameButton } from "@/components/play/GameButton";
import type { ClientBossQuestion, ClientMcqQuestion } from "@/lib/playSessionToken";
import { recordRun } from "@/lib/gameProfile";
import type { PlayCategory } from "@/lib/playConfig";
import { playCategoryFromSlug } from "@/lib/playConfig";

interface PlayRunClientProps {
  categorySlug: string;
}

type Phase = "loading" | "mcq" | "boss" | "results" | "error";

export function PlayRunClient({ categorySlug }: PlayRunClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = playCategoryFromSlug(categorySlug);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [mcqQuestion, setMcqQuestion] = useState<ClientMcqQuestion | null>(null);
  const [bossQuestion, setBossQuestion] = useState<ClientBossQuestion | null>(null);
  const [results, setResults] = useState<SessionResultsData | null>(null);

  const startSession = useCallback(async () => {
    if (!category) return;
    setPhase("loading");
    setError(null);

    const topic = searchParams.get("topic") ?? undefined;
    const difficulty = searchParams.get("difficulty") ?? undefined;

    try {
      const res = await fetch("/api/play/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, topic, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      setToken(data.token);
      setCombo(data.combo);
      setMaxCombo(data.combo);
      setMcqQuestion(data.question);
      setPhase("mcq");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setPhase("error");
    }
  }, [category, searchParams]);

  useEffect(() => {
    startSession();
  }, [startSession]);

  const handleMcqAnswered = (data: {
    token: string;
    pointsEarned: number;
    combo: number;
    maxCombo: number;
    phase: "mcq" | "boss";
    nextQuestion?: ClientMcqQuestion;
    bossQuestion?: ClientBossQuestion;
  }) => {
    setToken(data.token);
    setCombo(data.combo);
    setMaxCombo(data.maxCombo);

    if (data.phase === "boss" && data.bossQuestion) {
      setBossQuestion(data.bossQuestion);
      setPhase("boss");
    } else if (data.nextQuestion) {
      setMcqQuestion(data.nextQuestion);
      setPhase("mcq");
    }
  };

  const handleBossComplete = (data: {
    token: string;
    totalXp: number;
    mcqScore: number;
    bossScore: number;
    bossTimeBonus: number;
    maxCombo: number;
    accuracy: number;
    totalTimeMs: number;
    mcqCorrect: number;
    mcqTotal: number;
    bossCorrect: boolean;
    category: string;
  }) => {
    const cat = data.category as PlayCategory;
    recordRun({
      category: cat,
      totalXp: data.totalXp,
      maxCombo: data.maxCombo,
      mcqCorrect: data.mcqCorrect,
      mcqTotal: data.mcqTotal,
      bossCorrect: data.bossCorrect,
      accuracy: data.accuracy,
      totalTimeMs: data.totalTimeMs,
    });

    setResults({
      totalXp: data.totalXp,
      mcqScore: data.mcqScore,
      bossScore: data.bossScore,
      bossTimeBonus: data.bossTimeBonus,
      maxCombo: data.maxCombo,
      accuracy: data.accuracy,
      totalTimeMs: data.totalTimeMs,
      mcqCorrect: data.mcqCorrect,
      mcqTotal: data.mcqTotal,
      category: cat,
    });
    setPhase("results");
  };

  if (!category) {
    return (
      <div className="play-subpage max-w-2xl mx-auto">
      <GameCard>
        <p className="font-bold text-[var(--game-forest)]">Unknown category.</p>
      </GameCard>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="play-subpage max-w-2xl mx-auto">
      <GameCard className="text-center py-12">
        <p className="text-xl font-bold text-[var(--game-forest)]">Starting your run...</p>
      </GameCard>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="play-subpage max-w-2xl mx-auto">
      <GameCard className="space-y-4 text-center">
        <p className="font-bold text-[var(--game-forest)]">{error}</p>
        <GameButton onClick={() => router.push(`/play/${categorySlug}/setup`)}>
          Back to setup
        </GameButton>
      </GameCard>
      </div>
    );
  }

  if (phase === "results" && results) {
    return (
      <div className="play-subpage max-w-2xl mx-auto">
        <SessionResults data={results} />
      </div>
    );
  }

  if (phase === "boss" && bossQuestion) {
    return (
      <div className="play-subpage max-w-2xl mx-auto">
        <BossQuestion question={bossQuestion} token={token} onComplete={handleBossComplete} />
      </div>
    );
  }

  if (phase === "mcq" && mcqQuestion) {
    return (
      <div className="play-subpage max-w-2xl mx-auto">
      <SpeedRoundQuestion
        question={mcqQuestion}
        combo={combo}
        token={token}
        onAnswered={handleMcqAnswered}
      />
      </div>
    );
  }

  return null;
}
