import { createAnonClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOPIC_BY_QUESTION_ID, LEADERBOARD_TOPICS } from "@/lib/leaderboardTopics";
import type { Board, SprintMode, Window } from "@/lib/leaderboard";
import { SPRINT_MODES, WINDOWS, TOP_N } from "@/lib/leaderboard";

function windowStart(window: Window): Date | null {
  if (window === "all") return null;
  const d = new Date();
  if (window === "daily") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - 7);
  return d;
}

async function aggregateSolved(
  window: Window,
  topic: string | null
): Promise<{ userId: string; value: number }[]> {
  const supabase = createAnonClient();
  const since = windowStart(window);
  let query = supabase
    .from("question_attempts")
    .select("user_id, question_id, solved_at")
    .eq("status", "solved");
  if (since) query = query.gte("solved_at", since.toISOString());
  const { data } = await query;
  const counts = new Map<string, number>();
  for (const a of data ?? []) {
    if (topic && TOPIC_BY_QUESTION_ID.get(a.question_id) !== topic) continue;
    counts.set(a.user_id, (counts.get(a.user_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([userId, value]) => ({ userId, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_N);
}

async function aggregateSprint(
  window: Window,
  mode: SprintMode
): Promise<{ userId: string; value: number }[]> {
  const supabase = createAnonClient();
  const since = windowStart(window);
  let query = supabase
    .from("sprint_sessions")
    .select("user_id, score, mode_type, problems_solved")
    .eq("is_complete", true)
    .eq("mode_type", mode)
    .not("ended_at", "is", null);
  if (since) query = query.gte("started_at", since.toISOString());
  const { data } = await query;
  const best = new Map<string, number>();
  for (const s of data ?? []) {
    const value = mode === "MULTIPLICATION" ? s.problems_solved : s.score;
    const prev = best.get(s.user_id) ?? 0;
    if (value > prev) best.set(s.user_id, value);
  }
  return [...best.entries()]
    .map(([userId, value]) => ({ userId, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_N);
}

interface CacheRow {
  board: Board;
  time_window: Window;
  mode: string;
  topic: string;
  user_id: string;
  value: number;
  rank: number;
  refreshed_at: string;
}

async function upsertSlice(
  board: Board,
  window: Window,
  mode: string,
  topic: string,
  rows: { userId: string; value: number }[]
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client required to refresh leaderboard_cache");

  const now = new Date().toISOString();
  await admin
    .from("leaderboard_cache")
    .delete()
    .eq("board", board)
    .eq("time_window", window)
    .eq("mode", mode)
    .eq("topic", topic);

  if (rows.length === 0) return;

  const payload: CacheRow[] = rows.map((r, i) => ({
    board,
    time_window: window,
    mode,
    topic,
    user_id: r.userId,
    value: r.value,
    rank: i + 1,
    refreshed_at: now,
  }));

  const { error } = await admin.from("leaderboard_cache").insert(payload);
  if (error) throw error;
}

/** Recompute all leaderboard slices into leaderboard_cache. */
export async function refreshLeaderboardCache(): Promise<{ slices: number }> {
  let slices = 0;

  for (const window of WINDOWS.map((w) => w.id)) {
    const solved = await aggregateSolved(window, null);
    await upsertSlice("solved", window, "", "", solved);
    slices += 1;

    for (const topic of LEADERBOARD_TOPICS) {
      const byTopic = await aggregateSolved(window, topic);
      await upsertSlice("topic", window, "", topic, byTopic);
      slices += 1;
    }

    for (const mode of SPRINT_MODES.map((m) => m.id)) {
      const sprint = await aggregateSprint(window, mode);
      await upsertSlice("sprint", window, mode, "", sprint);
      slices += 1;
    }
  }

  return { slices };
}
