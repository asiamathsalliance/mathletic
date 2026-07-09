import Link from "next/link";
import { Flame, CheckCircle2, Zap, Trophy } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Compact stats strip above the problem list — only rendered for signed-in
 * users (logged-out users keep the localStorage solved counter in the filter bar).
 */
export async function StatsStrip() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: attempts }, { data: bestSprint }, { data: allSolvedCounts }] =
    await Promise.all([
      supabase
        .from("question_attempts")
        .select("status, solved_at")
        .eq("user_id", user.id),
      supabase
        .from("sprint_sessions")
        .select("score")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .order("score", { ascending: false })
        .limit(1),
      supabase
        .from("question_attempts")
        .select("user_id")
        .eq("status", "solved"),
    ]);

  const solved = (attempts ?? []).filter((a) => a.status === "solved");
  const solvedCount = solved.length;

  // Consecutive-day streak ending today or yesterday.
  const days = new Set(
    solved
      .filter((a) => a.solved_at)
      .map((a) => new Date(a.solved_at as string).toISOString().slice(0, 10))
  );
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const best = bestSprint?.[0]?.score ?? 0;

  // Rank among all users by solved count.
  const countsByUser = new Map<string, number>();
  for (const row of allSolvedCounts ?? []) {
    countsByUser.set(row.user_id, (countsByUser.get(row.user_id) ?? 0) + 1);
  }
  const better = [...countsByUser.values()].filter((c) => c > solvedCount).length;
  const rank = countsByUser.size > 0 ? better + 1 : null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="size-4 text-[#2F7D4F]" />
        <span className="font-semibold">{solvedCount}</span>
        <span className="text-muted-foreground">solved</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Flame className="size-4 text-[#C9941F]" />
        <span className="font-semibold">{streak === 1 ? "1 day" : `${streak} days`}</span>
        <span className="text-muted-foreground">streak</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Zap className="size-4 text-[#8FA82F]" />
        <span className="font-semibold">{best}</span>
        <span className="text-muted-foreground">best sprint</span>
      </span>
      {rank != null && (
        <Link href="/leaderboard" className="flex items-center gap-1.5 hover:underline">
          <Trophy className="size-4 text-[#C9941F]" />
          <span className="font-semibold">#{rank}</span>
          <span className="text-muted-foreground">on the leaderboard</span>
        </Link>
      )}
    </div>
  );
}
