import Link from "next/link";
import { Trophy } from "lucide-react";
import { createClient, createAnonClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { socialInitial } from "@/lib/profile/avatar";
import { getAllQuestions } from "@/lib/questions";
import { resolvePublicUserLabels } from "@/lib/publicProfile";
import { getSimpleTopic } from "@/lib/questionTable";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Leaderboard | Mathletic",
};

type Board = "solved" | "sprint" | "topic";
type Window = "daily" | "weekly" | "all";

const BOARDS: { id: Board; label: string }[] = [
  { id: "solved", label: "Most Solved" },
  { id: "sprint", label: "Best Sprint" },
  { id: "topic", label: "By Topic" },
];

const WINDOWS: { id: Window; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "all", label: "All-Time" },
];

type SprintMode = "MULTIPLICATION" | "PROBLEM_POOL";

const SPRINT_MODES: { id: SprintMode; label: string }[] = [
  { id: "MULTIPLICATION", label: "Multiplication" },
  { id: "PROBLEM_POOL", label: "Problem" },
];

const SPRINT_MODE_LABEL: Record<SprintMode, string> = {
  MULTIPLICATION: "Multiplication",
  PROBLEM_POOL: "Problem",
};

const TOP_N = 50;

const ROW_GRID = "grid-cols-[2.5rem_minmax(0,1fr)_4.5rem]";
const SPRINT_ROW_GRID = "grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_6rem]";
const ROW_GAP = "gap-x-4";

interface Row {
  userId: string;
  value: number;
  detail?: string;
  modeLabel?: string;
}

interface UserInfo {
  displayLabel: string;
  profileSlug: string | null;
}

function windowStart(window: Window): Date | null {
  if (window === "all") return null;
  const d = new Date();
  if (window === "daily") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - 7);
  return d;
}

interface PageProps {
  searchParams: Promise<{ board?: string; window?: string; mode?: string; topic?: string }>;
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const board = (BOARDS.some((b) => b.id === params.board) ? params.board : "solved") as Board;
  const window = (WINDOWS.some((w) => w.id === params.window) ? params.window : "all") as Window;
  const sprintMode: SprintMode =
    params.mode === "PROBLEM_POOL" ? "PROBLEM_POOL" : "MULTIPLICATION";

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <Heading />
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Leaderboards need the Supabase backend. Add your Supabase keys to{" "}
          <code>.env.local</code> (see the README) and restart the dev server.
        </div>
      </div>
    );
  }

  const supabase = createAnonClient();
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  // Topics present in the bank (for the topic board select).
  const allQuestions = await getAllQuestions();
  const topics = [...new Set(allQuestions.map((q) => getSimpleTopic(q.topic)))].sort();
  const topic = params.topic && topics.includes(params.topic) ? params.topic : topics[0] ?? "";
  const topicByQuestionId = new Map(allQuestions.map((q) => [q.id, getSimpleTopic(q.topic)]));

  const since = windowStart(window);

  // ---- aggregate rows ----
  // NOTE: live aggregates are fine at current scale; switch to a materialized
  // view (refreshed on a schedule) if traffic grows.
  let rows: Row[] = [];
  let valueLabel = "Solved";

  if (board === "solved" || board === "topic") {
    let query = supabase
      .from("question_attempts")
      .select("user_id, question_id, solved_at")
      .eq("status", "solved");
    if (since) query = query.gte("solved_at", since.toISOString());
    const { data } = await query;
    const counts = new Map<string, number>();
    for (const a of data ?? []) {
      if (board === "topic" && topicByQuestionId.get(a.question_id) !== topic) continue;
      counts.set(a.user_id, (counts.get(a.user_id) ?? 0) + 1);
    }
    rows = [...counts.entries()]
      .map(([userId, value]) => ({ userId, value }))
      .sort((a, b) => b.value - a.value);
    valueLabel = "Solved";
  } else {
    let query = supabase
      .from("sprint_sessions")
      .select("user_id, score, mode_type, problems_solved, attempts_count")
      .eq("is_complete", true)
      .eq("mode_type", sprintMode)
      .not("ended_at", "is", null);
    if (since) query = query.gte("started_at", since.toISOString());
    const { data } = await query;

    const modeLabel = SPRINT_MODE_LABEL[sprintMode];
    const best = new Map<string, number>();
    for (const s of data ?? []) {
      const value =
        sprintMode === "MULTIPLICATION" ? s.problems_solved : s.score;
      const prev = best.get(s.user_id) ?? 0;
      if (value > prev) best.set(s.user_id, value);
    }
    rows = [...best.entries()]
      .map(([userId, value]) => ({
        userId,
        value,
        modeLabel,
        detail: `${value} ${sprintMode === "MULTIPLICATION" ? "solved" : "pts"}`,
      }))
      .sort((a, b) => b.value - a.value);
    valueLabel = sprintMode === "MULTIPLICATION" ? "Solved" : "Score";
  }

  // ---- user info for visible rows (+ self) ----
  const visible = rows.slice(0, TOP_N);
  const yourIndex = user ? rows.findIndex((r) => r.userId === user.id) : -1;
  const yourRow = yourIndex >= 0 ? rows[yourIndex] : null;
  const idsToFetch = [
    ...new Set([...visible.map((r) => r.userId), ...(yourRow ? [yourRow.userId] : [])]),
  ];
  const usersById = await resolvePublicUserLabels(idsToFetch);

  const makeHref = (over: Partial<{ board: Board; window: Window; mode: SprintMode; topic: string }>) => {
    const p = new URLSearchParams();
    const nextBoard = over.board ?? board;
    p.set("board", nextBoard);
    p.set("window", over.window ?? window);
    if (nextBoard === "sprint") {
      p.set("mode", over.mode ?? sprintMode);
    }
    if (nextBoard === "topic") p.set("topic", over.topic ?? topic);
    return `/leaderboard?${p.toString()}`;
  };

  const yourRankOffScreen = yourIndex >= TOP_N;

  return (
    <div className="space-y-6">
      <Heading />

      {/* Board tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
          {BOARDS.map((b) => (
            <Link
              key={b.id}
              href={makeHref({
                board: b.id,
                ...(b.id === "sprint" ? { mode: sprintMode } : {}),
              })}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                b.id === board
                  ? "bg-[#1C4B3B] text-white"
                  : "text-[#1C4B3B] hover:bg-background"
              )}
            >
              {b.label}
            </Link>
          ))}
        </div>

        <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
          {WINDOWS.map((w) => (
            <Link
              key={w.id}
              href={makeHref({ window: w.id })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                w.id === window
                  ? "bg-[#1C4B3B] text-white"
                  : "text-[#1C4B3B] hover:bg-background"
              )}
            >
              {w.label}
            </Link>
          ))}
        </div>

        {board === "sprint" && (
          <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
            {SPRINT_MODES.map((m) => (
              <Link
                key={m.id}
                href={makeHref({ mode: m.id })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  m.id === sprintMode
                    ? "bg-[#1C4B3B] text-white"
                    : "text-[#1C4B3B] hover:bg-background"
                )}
              >
                {m.label}
              </Link>
            ))}
          </div>
        )}

        {board === "topic" && (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <Link
                key={t}
                href={makeHref({ topic: t })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  t === topic
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          Nothing here yet — be the first on the board!
        </p>
      ) : (
        <ul className="rounded-lg border border-border bg-card overflow-hidden">
          <li
            className={cn(
              "grid items-center border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
              ROW_GAP,
              board === "sprint" ? SPRINT_ROW_GRID : ROW_GRID
            )}
          >
            <span>#</span>
            <span>Player</span>
            <span className="justify-self-center text-center">{valueLabel}</span>
            {board === "sprint" && <span className="justify-self-center text-center">Mode</span>}
          </li>
          {visible.map((row, i) => (
            <LeaderRow
              key={row.userId}
              rank={i + 1}
              row={row}
              info={usersById.get(row.userId)}
              isYou={user?.id === row.userId}
              showMode={board === "sprint"}
            />
          ))}
        </ul>
      )}

      {/* Pinned your-rank footer when off-screen */}
      {yourRankOffScreen && yourRow && (
        <div className="sticky bottom-4">
          <ul className="rounded-lg border-2 border-primary bg-card shadow-md overflow-hidden">
            <LeaderRow
              rank={yourIndex + 1}
              row={yourRow}
              info={usersById.get(yourRow.userId)}
              isYou
              showMode={board === "sprint"}
            />
          </ul>
        </div>
      )}
    </div>
  );
}

function Heading() {
  return (
    <div>
      <h1 className="text-page-title flex items-center gap-2">
        <Trophy className="size-7 text-[#C9941F]" />
        Leaderboard
      </h1>
      <p className="text-muted-foreground mt-1">
        Most solved, best sprint scores, and topic specialists.
      </p>
    </div>
  );
}

function LeaderRow({
  rank,
  row,
  info,
  isYou,
  showMode = false,
}: {
  rank: number;
  row: Row;
  info?: UserInfo;
  isYou: boolean;
  showMode?: boolean;
}) {
  const username = info?.displayLabel ?? "anonymous";
  const profileSlug = info?.profileSlug;
  const initial = socialInitial(profileSlug ?? username);
  const rankColor =
    rank === 1
      ? "text-[#C9941F]"
      : rank === 2
        ? "text-[#8A8A8A]"
        : rank === 3
          ? "text-[#A6524F]"
          : "text-muted-foreground";
  return (
    <li
      className={cn(
        "grid items-center border-b border-border px-4 py-2.5 last:border-0",
        ROW_GAP,
        showMode ? SPRINT_ROW_GRID : ROW_GRID,
        isYou && "bg-primary/10"
      )}
    >
      <span className={cn("text-sm font-semibold tabular-nums", rankColor)}>{rank}</span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {initial}
        </span>
        {profileSlug ? (
          <Link
            href={`/u/${profileSlug}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {username}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium">{username}</span>
        )}
        {isYou && <span className="ml-1.5 text-xs text-muted-foreground shrink-0">(you)</span>}
        {!showMode && row.detail && (
          <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
            {row.detail}
          </span>
        )}
      </span>
      <span className="justify-self-center text-center text-sm font-semibold tabular-nums">
        {row.value}
      </span>
      {showMode && (
        <span className="justify-self-center text-center text-xs font-medium text-muted-foreground">
          {row.modeLabel ?? "—"}
        </span>
      )}
    </li>
  );
}
