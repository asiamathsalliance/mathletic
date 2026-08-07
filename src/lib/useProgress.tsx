"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Question } from "@/types/question";
import { getSolvedMap, markQuestionSolved } from "@/lib/progress";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface AttemptRecord {
  question_id: string;
  status: "solved" | "attempted";
  solved_at: string | null;
  attempt_count: number;
}

export interface ProgressState {
  /** null while loading */
  signedIn: boolean | null;
  attempts: AttemptRecord[];
  solvedIds: Set<string>;
  loaded: boolean;
  refresh: () => void;
  reportAttempt: (question: Question, correct: boolean) => void;
}

const ProgressContext = createContext<ProgressState | null>(null);

function persistAttempt(question: Question, correct: boolean): void {
  if (!isSupabaseConfigured()) {
    if (correct) markQuestionSolved(question);
    return;
  }

  const supabase = createClient();
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      if (data.session) {
        return fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: question.id, correct }),
        }).then(() => undefined);
      }
      if (correct) markQuestionSolved(question);
    })
    .catch(() => {
      if (correct) markQuestionSolved(question);
    });
}

/**
 * Single shared progress store for the app.
 * Without this, every QuestionCard / dashboard widget would hit GET /api/attempts.
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const useLocal = () => {
      if (cancelled) return;
      const map = getSolvedMap();
      setSignedIn(false);
      setAttempts([]);
      setSolvedIds(new Set(Object.keys(map)));
      setLoaded(true);
    };

    if (!isSupabaseConfigured()) {
      useLocal();
      return;
    }

    fetch("/api/attempts")
      .then((r) => (r.ok ? r.json() : { signedIn: false, attempts: [] }))
      .then((data: { signedIn?: boolean; attempts?: AttemptRecord[] }) => {
        if (cancelled) return;
        if (!data.signedIn) {
          useLocal();
          return;
        }
        const dbAttempts = data.attempts ?? [];
        setSignedIn(true);
        setAttempts(dbAttempts);
        setSolvedIds(
          new Set(dbAttempts.filter((a) => a.status === "solved").map((a) => a.question_id))
        );
        setLoaded(true);
      })
      .catch(useLocal);

    return () => {
      cancelled = true;
    };
  }, [version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const reportAttempt = useCallback((question: Question, correct: boolean) => {
    if (correct) {
      setSolvedIds((prev) => {
        if (prev.has(question.id)) return prev;
        const next = new Set(prev);
        next.add(question.id);
        return next;
      });
      setAttempts((prev) => {
        const existing = prev.find((a) => a.question_id === question.id);
        const now = new Date().toISOString();
        if (existing) {
          if (existing.status === "solved") {
            return prev.map((a) =>
              a.question_id === question.id
                ? { ...a, attempt_count: a.attempt_count + 1 }
                : a
            );
          }
          return prev.map((a) =>
            a.question_id === question.id
              ? {
                  ...a,
                  status: "solved" as const,
                  solved_at: a.solved_at ?? now,
                  attempt_count: a.attempt_count + 1,
                }
              : a
          );
        }
        return [
          ...prev,
          {
            question_id: question.id,
            status: "solved" as const,
            solved_at: now,
            attempt_count: 1,
          },
        ];
      });
    } else {
      setAttempts((prev) => {
        const existing = prev.find((a) => a.question_id === question.id);
        if (existing) {
          return prev.map((a) =>
            a.question_id === question.id
              ? { ...a, attempt_count: a.attempt_count + 1 }
              : a
          );
        }
        return [
          ...prev,
          {
            question_id: question.id,
            status: "attempted" as const,
            solved_at: null,
            attempt_count: 1,
          },
        ];
      });
    }

    persistAttempt(question, correct);
  }, []);

  const value = useMemo<ProgressState>(
    () => ({
      signedIn,
      attempts,
      solvedIds,
      loaded,
      refresh,
      reportAttempt,
    }),
    [signedIn, attempts, solvedIds, loaded, refresh, reportAttempt]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressState {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used within ProgressProvider");
  }
  return ctx;
}

/** Solved-only view of useProgress, for the problem table and filters. */
export function useSolvedIds(): { solvedIds: Set<string>; loaded: boolean; refresh: () => void } {
  const { solvedIds, loaded, refresh } = useProgress();
  return { solvedIds, loaded, refresh };
}

/**
 * @deprecated Prefer `useProgress().reportAttempt` so UI state updates immediately.
 * Kept for any stray call sites; persists only (no shared store update).
 */
export function reportAttempt(question: Question, correct: boolean): void {
  persistAttempt(question, correct);
}
