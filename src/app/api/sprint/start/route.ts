import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { pickSprintQuestion } from "@/lib/sprintServer";
import { SPRINT_DAILY_LIMIT, SPRINT_DURATION_SECONDS, type SprintMode } from "@/lib/sprint";

const MODES: SprintMode[] = ["easy", "medium", "hard", "mixed"];

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Sprint needs Supabase configured (see README setup)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in with Google to play Sprint." }, { status: 401 });
  }

  let body: { mode?: string; topic?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const mode = (body.mode ?? "mixed") as SprintMode;
  if (!MODES.includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }
  const topic = typeof body.topic === "string" && body.topic ? body.topic : null;

  // Rate limit: sessions started today.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("sprint_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", dayStart.toISOString());
  if ((count ?? 0) >= SPRINT_DAILY_LIMIT) {
    return Response.json(
      { error: `Daily sprint limit reached (${SPRINT_DAILY_LIMIT}). Come back tomorrow!` },
      { status: 429 }
    );
  }

  const picked = await pickSprintQuestion({
    mode,
    topic,
    excludeIds: new Set(),
    elapsedFraction: 0,
  });
  if (!picked) {
    return Response.json(
      { error: "No questions available for that mode/topic." },
      { status: 404 }
    );
  }

  const { data: session, error } = await supabase
    .from("sprint_sessions")
    .insert({
      user_id: user.id,
      mode,
      topic,
      duration_seconds: SPRINT_DURATION_SECONDS,
    })
    .select("id, started_at")
    .single();
  if (error || !session) {
    return Response.json({ error: error?.message ?? "Failed to start" }, { status: 500 });
  }

  return Response.json({
    sessionId: session.id,
    startedAt: session.started_at,
    durationSeconds: SPRINT_DURATION_SECONDS,
    question: picked.question,
  });
}
