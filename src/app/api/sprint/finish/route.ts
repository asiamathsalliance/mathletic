import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Finish a sprint: aggregate attempts into the session row. Body: { sessionId } */
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
    .select("id, finished_at")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  const { data: attempts } = await supabase
    .from("sprint_attempts")
    .select("correct, points")
    .eq("session_id", session.id);

  const answered = attempts?.length ?? 0;
  const correct = attempts?.filter((a) => a.correct).length ?? 0;
  const score = attempts?.reduce((s, a) => s + a.points, 0) ?? 0;

  if (!session.finished_at) {
    const { error } = await supabase
      .from("sprint_sessions")
      .update({
        finished_at: new Date().toISOString(),
        score,
        questions_answered: answered,
        questions_correct: correct,
      })
      .eq("id", session.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  // Personal best for context on the results screen.
  const { data: best } = await supabase
    .from("sprint_sessions")
    .select("score")
    .eq("user_id", user.id)
    .not("finished_at", "is", null)
    .order("score", { ascending: false })
    .limit(1);

  return Response.json({
    score,
    answered,
    correct,
    bestScore: Math.max(score, best?.[0]?.score ?? 0),
  });
}
