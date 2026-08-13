import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/server";
import { resolvePublicUserLabels } from "@/lib/publicProfile";

export type Board = "solved" | "sprint";
export type Window = "daily" | "weekly" | "all";
export type SprintMode = "MULTIPLICATION" | "PROBLEM_POOL";

export const BOARDS: { id: Board; label: string }[] = [
  { id: "solved", label: "Most Solved" },
  { id: "sprint", label: "Best Sprint" },
];

export const WINDOWS: { id: Window; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "all", label: "All-Time" },
];

export const SPRINT_MODES: { id: SprintMode; label: string }[] = [
  { id: "MULTIPLICATION", label: "Multiplication" },
  { id: "PROBLEM_POOL", label: "Problem" },
];

export const SPRINT_MODE_LABEL: Record<SprintMode, string> = {
  MULTIPLICATION: "Multiplication",
  PROBLEM_POOL: "Problem",
};

export const TOP_N = 50;

export const ROW_GRID = "grid-cols-[2.5rem_minmax(0,1fr)_4.5rem]";
export const SPRINT_ROW_GRID = "grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_6rem]";
export const ROW_GAP = "gap-x-4";

export interface LeaderboardRow {
  userId: string;
  value: number;
  detail?: string;
  modeLabel?: string;
}

export interface LeaderboardParams {
  board: Board;
  window: Window;
  mode: SprintMode;
}

export interface LeaderboardUserInfo {
  displayLabel: string;
  profileSlug: string | null;
  avatarUrl: string | null;
}

export interface LeaderboardData {
  rows: LeaderboardRow[];
  valueLabel: string;
}

export interface LeaderboardSearchParams {
  board?: string;
  window?: string;
  mode?: string;
}

function windowStart(window: Window): Date | null {
  if (window === "all") return null;
  const d = new Date();
  if (window === "daily") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - 7);
  return d;
}

export function parseLeaderboardParams(raw: LeaderboardSearchParams): LeaderboardParams {
  // Legacy `board=topic` links fall back to Most Solved.
  const board = (BOARDS.some((b) => b.id === raw.board) ? raw.board : "solved") as Board;
  const window = (WINDOWS.some((w) => w.id === raw.window) ? raw.window : "all") as Window;
  const mode: SprintMode = raw.mode === "PROBLEM_POOL" ? "PROBLEM_POOL" : "MULTIPLICATION";

  return { board, window, mode };
}

export function valueLabelFor(params: LeaderboardParams): string {
  if (params.board === "sprint" && params.mode === "PROBLEM_POOL") return "Score";
  return "Solved";
}

export function makeLeaderboardHref(
  params: LeaderboardParams,
  over: Partial<LeaderboardParams> = {}
): string {
  const p = new URLSearchParams();
  const nextBoard = over.board ?? params.board;
  p.set("board", nextBoard);
  p.set("window", over.window ?? params.window);
  if (nextBoard === "sprint") {
    p.set("mode", over.mode ?? params.mode);
  }
  return `/leaderboard?${p.toString()}`;
}

async function fetchFromCache(params: LeaderboardParams): Promise<LeaderboardRow[] | null> {
  const supabase = createAnonClient();
  const mode = params.board === "sprint" ? params.mode : "";
  const { data, error } = await supabase
    .from("leaderboard_cache")
    .select("user_id, value, rank")
    .eq("board", params.board)
    .eq("time_window", params.window)
    .eq("mode", mode)
    .eq("topic", "")
    .order("rank", { ascending: true })
    .limit(TOP_N);
  if (error || !data || data.length === 0) return null;

  const modeLabel = params.board === "sprint" ? SPRINT_MODE_LABEL[params.mode] : undefined;
  return data.map((r) => ({
    userId: r.user_id as string,
    value: Number(r.value),
    modeLabel,
    detail:
      params.board === "sprint"
        ? `${Number(r.value)} ${params.mode === "MULTIPLICATION" ? "solved" : "pts"}`
        : undefined,
  }));
}

async function fetchLeaderboardRowsLive(params: LeaderboardParams): Promise<LeaderboardData> {
  const supabase = createAnonClient();
  const since = windowStart(params.window);

  if (params.board === "solved") {
    let query = supabase
      .from("question_attempts")
      .select("user_id, question_id, solved_at")
      .eq("status", "solved");
    if (since) query = query.gte("solved_at", since.toISOString());
    const { data } = await query;
    const counts = new Map<string, number>();
    for (const a of data ?? []) {
      counts.set(a.user_id, (counts.get(a.user_id) ?? 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([userId, value]) => ({ userId, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_N);
    return { rows, valueLabel: "Solved" };
  }

  let query = supabase
    .from("sprint_sessions")
    .select("user_id, score, mode_type, problems_solved, attempts_count")
    .eq("is_complete", true)
    .eq("mode_type", params.mode)
    .not("ended_at", "is", null);
  if (since) query = query.gte("started_at", since.toISOString());
  const { data } = await query;

  const modeLabel = SPRINT_MODE_LABEL[params.mode];
  const best = new Map<string, number>();
  for (const s of data ?? []) {
    const value = params.mode === "MULTIPLICATION" ? s.problems_solved : s.score;
    const prev = best.get(s.user_id) ?? 0;
    if (value > prev) best.set(s.user_id, value);
  }
  const rows = [...best.entries()]
    .map(([userId, value]) => ({
      userId,
      value,
      modeLabel,
      detail: `${value} ${params.mode === "MULTIPLICATION" ? "solved" : "pts"}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_N);

  return {
    rows,
    valueLabel: params.mode === "MULTIPLICATION" ? "Solved" : "Score",
  };
}

async function fetchLeaderboardRows(params: LeaderboardParams): Promise<LeaderboardData> {
  const cached = await fetchFromCache(params);
  if (cached) {
    return {
      rows: cached,
      valueLabel: valueLabelFor(params),
    };
  }
  return fetchLeaderboardRowsLive(params);
}

export const getCachedLeaderboardRows = unstable_cache(
  fetchLeaderboardRows,
  ["leaderboard-rows"],
  { revalidate: 60 }
);

export async function fetchLeaderboardUsers(
  userIds: string[]
): Promise<Map<string, LeaderboardUserInfo>> {
  if (userIds.length === 0) return new Map();
  return resolvePublicUserLabels(userIds);
}
