"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiplicationPlay } from "@/components/sprint/MultiplicationPlay";
import { ProblemPlay } from "@/components/sprint/ProblemPlay";
import { SprintHeldBeat } from "@/components/sprint/SprintHeldBeat";
import { SprintResults, type SprintResultData } from "@/components/sprint/SprintResults";
import { SprintRingTimer } from "@/components/sprint/SprintRingTimer";
import {
  type MultiplicationProblem,
  type SprintModeType,
  type SprintQuestion,
} from "@/lib/sprint";
import { SPRINT_EXIT_MS, SPRINT_HELD_MS, sleep } from "@/lib/sprintTransition";
import { cn } from "@/lib/utils";

type Phase = "loading" | "running" | "exiting" | "held" | "results" | "error";

interface RunState {
  sessionId: string;
  endsAt: number;
  durationSeconds: number;
  score: number;
  problemsSolved: number;
  attemptsCount: number;
  bestStreak: number;
  multiplicationProblem?: MultiplicationProblem;
  question?: SprintQuestion;
}

export function SprintPlayClient({
  modeType,
  backHref,
  signedIn,
  configured,
}: {
  modeType: SprintModeType;
  backHref: string;
  signedIn: boolean;
  configured: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [results, setResults] = useState<SprintResultData | null>(null);
  const [frozen, setFrozen] = useState(false);
  const finishing = useRef(false);
  const started = useRef(false);

  const finishSprint = useCallback(async (sessionId: string) => {
    if (finishing.current) return;
    finishing.current = true;
    setFrozen(true);
    setPhase("exiting");

    const finishPromise = fetch("/api/sprint/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).then(async (res) => ({
      ok: res.ok,
      data: await res.json(),
    }));

    await sleep(SPRINT_EXIT_MS);
    setPhase("held");

    const [{ ok, data }] = await Promise.all([finishPromise, sleep(SPRINT_HELD_MS)]);

    if (ok) {
      setResults(data as SprintResultData);
      setPhase("results");
    } else {
      setError(data.error ?? "Failed to finish sprint");
      setPhase("error");
    }
    finishing.current = false;
  }, []);

  useEffect(() => {
    if (!configured || !signedIn || started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch("/api/sprint/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modeType }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to start sprint");
          setPhase("error");
          return;
        }

        setRun({
          sessionId: data.sessionId,
          endsAt: Date.now() + data.durationSeconds * 1000,
          durationSeconds: data.durationSeconds,
          score: 0,
          problemsSolved: 0,
          attemptsCount: 0,
          bestStreak: 0,
          multiplicationProblem: data.problem,
          question: data.question,
        });
        setPhase("running");
      } catch {
        setError("Network error starting sprint");
        setPhase("error");
      }
    })();
  }, [configured, signedIn, modeType]);

  const handleAnswered = useCallback(
    (result: { correct: boolean; points: number; currentStreak?: number }) => {
      setRun((prev) => {
        if (!prev) return prev;
        const streak = result.currentStreak ?? 0;
        return {
          ...prev,
          score: prev.score + result.points,
          problemsSolved: prev.problemsSolved + (result.correct ? 1 : 0),
          attemptsCount: prev.attemptsCount + 1,
          bestStreak: Math.max(prev.bestStreak, streak),
        };
      });
    },
    []
  );

  if (!configured) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-sm text-muted-foreground">
        Sprint needs Supabase configured.
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">Sign in to play Sprint.</p>
        <Link href="/sprint">
          <Button variant="outline">Back to sprint</Button>
        </Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Zap className="size-8 animate-pulse text-[#8FA82F]" />
        <p className="text-muted-foreground text-sm">Starting sprint…</p>
      </div>
    );
  }

  if (phase === "results" && results) {
    return <SprintResults results={results} backHref={backHref} />;
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Link href={backHref}>
          <Button variant="outline">Back to sprint</Button>
        </Link>
      </div>
    );
  }

  if (!run) return null;

  const sessionEnding = phase === "exiting" || phase === "held";

  return (
    <>
      {phase === "held" && <SprintHeldBeat />}

      <div
        className={cn(
          "mx-auto max-w-2xl px-4 pb-12",
          phase === "held" && "invisible"
        )}
      >
        <div
          className={cn(
            "mb-6 flex items-center justify-between gap-4 pt-2",
            phase === "exiting" && "sprint-session-exit"
          )}
        >
          <div className="text-sm">
            <span className="font-semibold">{run.problemsSolved}</span>
            <span className="text-muted-foreground"> solved</span>
            {modeType === "PROBLEM_POOL" && (
              <span className="ml-4 inline-flex items-center gap-1 font-semibold">
                <Zap className="size-4 text-[#8FA82F]" />
                {run.score}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!sessionEnding && (
              <button
                type="button"
                onClick={() => void finishSprint(run.sessionId)}
                className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                End sprint
              </button>
            )}
            <SprintRingTimer
              endsAt={run.endsAt}
              durationSeconds={run.durationSeconds}
              onTimeUp={() => void finishSprint(run.sessionId)}
            />
          </div>
        </div>

        <div className={cn(phase === "exiting" && "sprint-session-exit")}>
          {modeType === "MULTIPLICATION" && run.multiplicationProblem && (
            <MultiplicationPlay
              sessionId={run.sessionId}
              initialProblem={run.multiplicationProblem}
              onAnswered={handleAnswered}
              onTimeUp={() => void finishSprint(run.sessionId)}
              frozen={frozen}
            />
          )}

          {modeType === "PROBLEM_POOL" && run.question && (
            <ProblemPlay
              sessionId={run.sessionId}
              initialQuestion={run.question}
              onAnswered={handleAnswered}
              onTimeUp={() => void finishSprint(run.sessionId)}
              onPoolExhausted={() => void finishSprint(run.sessionId)}
              frozen={frozen}
            />
          )}
        </div>
      </div>
    </>
  );
}
