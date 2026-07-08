"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeedRoundQuestion } from "@/components/play/SpeedRoundQuestion";
import { BossQuestion } from "@/components/play/BossQuestion";
import { SessionResults, type SessionResultsData } from "@/components/play/SessionResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientBossQuestion, ClientMcqQuestion } from "@/lib/playSessionToken";
import { recordRun } from "@/lib/gameProfile";
import type { PlayCategory } from "@/lib/playConfig";
import { playCategoryFromSlug } from "@/lib/playConfig";

interface ChallengeRunClientProps {
  categorySlug: string;
}

type Phase = "loading" | "mcq" | "boss" | "results" | "error";

export function ChallengeRunClient({ categorySlug }: ChallengeRunClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = playCategoryFromSlug(categorySlug);
  const topic = searchParams.get("topic") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [mcqQuestion, setMcqQuestion] = useState<ClientMcqQuestion | null>(null);
  const [bossQuestion, setBossQuestion] = useState<ClientBossQuestion | null>(null);
  const [results, setResults] = useState<SessionResultsData | null>(null);

  useEffect(() => {
    if (!category) return;

    const controller = new AbortController();
    let active = true;

    (async () => {
      setPhase("loading");
      setError(null);

      try {
        const res = await fetch("/api/play/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            topic: topic || undefined,
            difficulty: difficulty || undefined,
          }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) throw new Error(data.message || data.error);
        if (!data.question) throw new Error("Session started but no question was returned.");

        setToken(data.token);
        setCombo(data.combo);
        setMaxCombo(data.combo);
        setMcqQuestion(data.question);
        setPhase("mcq");
      } catch (e) {
        if (!active || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Failed to start session");
        setPhase("error");
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [category, topic, difficulty]);

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
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <p>Unknown category.</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "loading") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Starting challenge...</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-8 text-center space-y-4">
          <p>{error}</p>
          <Button onClick={() => router.push(`/challenge/${categorySlug}/setup`)}>
            Back to setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "results" && results) {
    return (
      <div className="max-w-2xl mx-auto">
        <SessionResults data={results} />
      </div>
    );
  }

  if (phase === "boss" && bossQuestion) {
    return (
      <div className="max-w-2xl mx-auto">
        <BossQuestion question={bossQuestion} token={token} onComplete={handleBossComplete} />
      </div>
    );
  }

  if (phase === "mcq" && mcqQuestion) {
    return (
      <div className="max-w-2xl mx-auto">
        <SpeedRoundQuestion
          question={mcqQuestion}
          combo={combo}
          token={token}
          onAnswered={handleMcqAnswered}
        />
      </div>
    );
  }

  if (phase === "mcq") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-8 text-center space-y-4">
          <p>Could not load the first question.</p>
          <Button onClick={() => router.push(`/challenge/${categorySlug}/setup`)}>
            Back to setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
