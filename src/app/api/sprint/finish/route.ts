import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeBestStreak } from "@/lib/sprint";
import { checkAndAwardAchievements } from "@/lib/sprintAchievements";
import type { SprintModeType } from "@/lib/sprint";

/** Finish a sprint: aggregate attempts, award achievements. Body: { sessionId } */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.sessionId) return Response.json({ error: "Missing sessionId" }, { status: 400 });

  const { data: session } = await supabase
    .from("sprint_sessions")
    .select("id, mode_type, is_complete, ended_at")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  const { data: attempts } = await supabase
    .from("sprint_attempts")
    .select("correct, points")
    .eq("session_id", session.id)
    .order("order_index", { ascending: true });

  const attemptList = attempts ?? [];
  const attemptsCount = attemptList.length;
  const problemsSolved = attemptList.filter((a) => a.correct).length;
  const score = attemptList.reduce((s, a) => s + a.points, 0);
  const bestStreak = computeBestStreak(attemptList.map((a) => a.correct));
  const modeType = session.mode_type as SprintModeType;

  if (!session.is_complete) {
    const { error } = await supabase
      .from("sprint_sessions")
      .update({
        ended_at: new Date().toISOString(),
        is_complete: true,
        score,
        problems_solved: problemsSolved,
        attempts_count: attemptsCount,
        best_streak: bestStreak,
      })
      .eq("id", session.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  const newAchievements = await checkAndAwardAchievements(supabase, user.id, {
    modeType,
    problemsSolved,
    attemptsCount,
    bestStreak,
  });

  const { data: bests } = await supabase
    .from("sprint_sessions")
    .select("problems_solved")
    .eq("user_id", user.id)
    .eq("mode_type", modeType)
    .eq("is_complete", true)
    .order("problems_solved", { ascending: false })
    .limit(1);

  const personalBest = bests?.[0]?.problems_solved ?? problemsSolved;

  return Response.json({
    score,
    problemsSolved,
    attemptsCount,
    bestStreak,
    personalBest: Math.max(problemsSolved, personalBest),
    modeType,
    newAchievements,
  });
}
