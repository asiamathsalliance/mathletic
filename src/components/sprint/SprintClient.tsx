"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Zap, Trophy, ChevronRight, Check, X } from "lucide-react";
import { LatexText } from "@/components/LatexText";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  SPRINT_DURATION_SECONDS,
  SPRINT_MODES,
  type SprintMode,
  type SprintQuestion,
} from "@/lib/sprint";
import { cn } from "@/lib/utils";

type Phase = "setup" | "running" | "finished";

interface RunState {
  sessionId: string;
  question: SprintQuestion;
  endsAt: number;
  answered: number;
  correct: number;
  score: number;
}

interface Results {
  score: number;
  answered: number;
  correct: number;
  bestScore: number;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "text-[#2F7D4F]",
  Medium: "text-[#C9941F]",
  Hard: "text-[#C94A3D]",
};

export function SprintClient({
  topics,
  configured,
  signedIn,
}: {
  topics: string[];
  configured: boolean;
  signedIn: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<SprintMode>("mixed");
  const [topic, setTopic] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [run, setRun] = useState<RunState | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [timeLeft, setTimeLeft] = useState(SPRINT_DURATION_SECONDS);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctIndex: number; points: number } | null>(null);
  const questionShownAt = useRef<number>(0);
  const finishing = useRef(false);

  const signIn = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/sprint")}`,
      },
    });
  }, []);

  const finishSprint = useCallback(async (sessionId: string) => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      const res = await fetch("/api/sprint/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data as Results);
      } else {
        setError(data.error ?? "Failed to finish sprint");
      }
    } catch {
      setError("Network error finishing sprint");
    }
    setPhase("finished");
    finishing.current = false;
  }, []);

  // Countdown; auto-finish at zero.
  useEffect(() => {
    if (phase !== "running" || !run) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((run.endsAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) void finishSprint(run.sessionId);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [phase, run, finishSprint]);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/sprint/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, topic: topic || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start sprint");
        return;
      }
      finishing.current = false;
      setResults(null);
      setSelected(null);
      setFeedback(null);
      questionShownAt.current = Date.now();
      setRun({
        sessionId: data.sessionId,
        question: data.question,
        endsAt: Date.now() + data.durationSeconds * 1000,
        answered: 0,
        correct: 0,
        score: 0,
      });
      setTimeLeft(data.durationSeconds);
      setPhase("running");
    } catch {
      setError("Network error starting sprint");
    } finally {
      setStarting(false);
    }
  }, [mode, topic]);

  const answer = useCallback(
    async (index: number | null) => {
      if (!run || selected !== null || feedback !== null) return;
      if (index !== null) setSelected(index);
      const timeMs = Date.now() - questionShownAt.current;
      try {
        const res = await fetch("/api/sprint/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: run.sessionId,
            questionId: run.question.id,
            answerIndex: index,
            timeMs,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.timeUp) void finishSprint(run.sessionId);
          else setError(data.error ?? "Failed to submit answer");
          return;
        }
        setFeedback({ correct: data.correct, correctIndex: data.correctIndex, points: data.points });

        const nextQuestion: SprintQuestion | null = data.question;
        setTimeout(() => {
          setSelected(null);
          setFeedback(null);
          if (!nextQuestion) {
            void finishSprint(run.sessionId);
            return;
          }
          questionShownAt.current = Date.now();
          setRun((prev) =>
            prev
              ? {
                  ...prev,
                  question: nextQuestion,
                  answered: prev.answered + 1,
                  correct: prev.correct + (data.correct ? 1 : 0),
                  score: prev.score + data.points,
                }
              : prev
          );
        }, 700);
      } catch {
        setError("Network error submitting answer");
      }
    },
    [run, selected, feedback, finishSprint]
  );

  // ---------- setup ----------
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-page-title flex items-center gap-2">
            <Zap className="size-7 text-[#8FA82F]" />
            Sprint
          </h1>
          <p className="text-muted-foreground mt-1">
            5 minutes on the clock. Answer as many problems as you can — harder
            problems and faster answers score more.
          </p>
        </div>

        {!configured ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Sprint needs the Supabase backend. Add your Supabase keys to{" "}
            <code>.env.local</code> (see the README) and restart the dev server.
          </div>
        ) : !signedIn ? (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in to play Sprint and appear on the leaderboard.
            </p>
            <Button onClick={signIn}>Sign in with Google</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Difficulty</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SPRINT_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      mode === m.id
                        ? "border-primary bg-primary/15"
                        : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.blurb}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Topic</p>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 w-full max-w-xs rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
              >
                <option value="">All topics</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <Button size="lg" onClick={start} disabled={starting}>
              <Timer className="size-4 mr-2" />
              {starting ? "Starting…" : "Start 5-minute sprint"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---------- results ----------
  if (phase === "finished") {
    return (
      <div className="mx-auto max-w-xl space-y-8 py-8 text-center">
        <div>
          <Trophy className="mx-auto size-12 text-[#C9941F]" />
          <h1 className="text-page-title mt-3">Sprint complete</h1>
        </div>
        {results ? (
          <>
            <p className="text-5xl font-bold text-foreground">{results.score}</p>
            <p className="text-muted-foreground -mt-4">points</p>
            <div className="grid grid-cols-3 gap-4">
              <ResultStat label="Answered" value={String(results.answered)} />
              <ResultStat
                label="Correct"
                value={`${results.correct}/${results.answered}`}
              />
              <ResultStat label="Personal best" value={String(results.bestScore)} />
            </div>
          </>
        ) : (
          error && <p className="text-sm text-red-700">{error}</p>
        )}
        <div className="flex justify-center gap-3">
          <Button onClick={() => setPhase("setup")}>Run it back</Button>
          <Link href="/leaderboard">
            <Button variant="outline">
              Leaderboard
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------- running ----------
  if (!run) return null;
  const q = run.question;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const urgent = timeLeft <= 30;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Minimal chrome: timer + live counts */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
        <span
          className={cn(
            "flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums",
            urgent ? "text-[#C94A3D]" : "text-foreground"
          )}
        >
          <Timer className="size-5" />
          {minutes}:{String(seconds).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="font-semibold">{run.correct}</span>
            <span className="text-muted-foreground">/{run.answered} correct</span>
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <Zap className="size-4 text-[#8FA82F]" />
            {run.score}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", DIFFICULTY_COLOR[q.difficulty])}>
          {q.difficulty}
        </p>

        {q.imageUrl && (
          <div className="relative w-full min-h-[180px] rounded-md border border-border overflow-hidden bg-muted/30">
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
                disabled={feedback !== null}
                onClick={() => answer(index)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-md border px-4 py-3 text-left transition-colors",
                  showCorrect && "border-l-4 border-l-[#2F7D4F] bg-[#2F7D4F]/10 border-border",
                  showWrong && "border-l-4 border-l-[#C94A3D] bg-[#C94A3D]/10 border-border",
                  !showCorrect && !showWrong && "border-border hover:bg-muted/50"
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 min-w-0 text-sm">
                  <LatexText>{choice}</LatexText>
                </span>
                {showCorrect && <Check className="size-4 text-[#24603D] shrink-0" />}
                {showWrong && <X className="size-4 text-[#A03328] shrink-0" />}
              </button>
            );
          })}
        </div>

        {feedback && (
          <p
            className={cn(
              "text-sm font-semibold",
              feedback.correct ? "text-[#24603D]" : "text-[#A03328]"
            )}
          >
            {feedback.correct ? `Correct! +${feedback.points} pts` : "Incorrect"}
          </p>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => answer(null)}
          disabled={feedback !== null}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Skip question
        </button>
        <button
          type="button"
          onClick={() => finishSprint(run.sessionId)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          End sprint early
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
