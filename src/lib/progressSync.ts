"use client";

import { getSolvedMap } from "@/lib/progress";

const IMPORTED_FLAG = "math-exam-prep-progress-imported-v1";

/**
 * One-time import of localStorage solved progress into the DB after first login.
 * Safe to call repeatedly — a localStorage flag prevents duplicate imports and
 * the API upserts, so re-running is harmless anyway.
 */
export async function importLocalProgressOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(IMPORTED_FLAG)) return;
  } catch {
    return;
  }

  const solvedMap = getSolvedMap();
  const entries = Object.entries(solvedMap).map(([questionId, entry]) => ({
    questionId,
    solvedAt: entry.solvedAt,
  }));

  if (entries.length > 0) {
    const res = await fetch("/api/attempts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) return; // retry on next sign-in
  }

  try {
    window.localStorage.setItem(IMPORTED_FLAG, "1");
  } catch {
    // ignore
  }
}
