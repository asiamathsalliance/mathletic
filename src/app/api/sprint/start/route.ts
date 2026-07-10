import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { generateOperandPair } from "@/lib/sprintMultiplication";
import { pickProblemPoolQuestion } from "@/lib/sprintProblemPool";
import {
  SPRINT_DAILY_LIMIT,
  sprintDurationForMode,
  type SprintModeType,
} from "@/lib/sprint";

const MODES: SprintModeType[] = ["MULTIPLICATION", "PROBLEM_POOL"];

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

  let body: { modeType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const modeType = body.modeType as SprintModeType;
  if (!MODES.includes(modeType)) {
    return Response.json({ error: "Invalid modeType" }, { status: 400 });
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("sprint_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("mode_type", modeType)
    .gte("started_at", dayStart.toISOString());
  if ((count ?? 0) >= SPRINT_DAILY_LIMIT) {
    return Response.json(
      { error: `Daily ${modeType === "MULTIPLICATION" ? "multiplication" : "problem"} sprint limit reached (${SPRINT_DAILY_LIMIT}). Come back tomorrow!` },
      { status: 429 }
    );
  }

  if (modeType === "PROBLEM_POOL") {
    const picked = await pickProblemPoolQuestion(new Set());
    if (!picked) {
      return Response.json(
        { error: "No easy problems available in the question bank." },
        { status: 404 }
      );
    }
  }

  const durationSeconds = sprintDurationForMode(modeType);

  const { data: session, error } = await supabase
    .from("sprint_sessions")
    .insert({
      user_id: user.id,
      mode_type: modeType,
      duration_seconds: durationSeconds,
    })
    .select("id, started_at")
    .single();
  if (error || !session) {
    return Response.json({ error: error?.message ?? "Failed to start" }, { status: 500 });
  }

  if (modeType === "MULTIPLICATION") {
    const problem = generateOperandPair();
    return Response.json({
      sessionId: session.id,
      startedAt: session.started_at,
      durationSeconds,
      modeType,
      problem,
    });
  }

  const picked = await pickProblemPoolQuestion(new Set());
  return Response.json({
    sessionId: session.id,
    startedAt: session.started_at,
    durationSeconds,
    modeType,
    question: picked!.question,
  });
}
