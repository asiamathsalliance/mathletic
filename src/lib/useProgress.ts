"use client";

import { useCallback, useEffect, useState } from "react";
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
}

/**
 * Progress facade, strictly per-account:
 * - signed in  -> DB attempts only (localStorage is ignored so accounts
 *   sharing a browser never see each other's solves)
 * - signed out -> localStorage preview
 */
export function useProgress(): ProgressState {
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
  return { signedIn, attempts, solvedIds, loaded, refresh };
}

/** Solved-only view of useProgress, for the problem table and filters. */
export function useSolvedIds(): { solvedIds: Set<string>; loaded: boolean; refresh: () => void } {
  const { solvedIds, loaded, refresh } = useProgress();
  return { solvedIds, loaded, refresh };
}

/**
 * Record an attempt for the right store: DB when signed in, localStorage when
 * signed out. Never both, so accounts on a shared browser stay separate.
 */
export function reportAttempt(question: Question, correct: boolean): void {
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
