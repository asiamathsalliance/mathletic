import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getQuestionById } from "@/lib/questions";
import { pickSprintQuestion } from "@/lib/sprintServer";
import { SPRINT_GRACE_MS, sprintPoints, type SprintMode } from "@/lib/sprint";

/**
 * Record an answer (or a skip when answerIndex is null) and return the next
 * question chosen by the time-weighted difficulty curve.
 *
 * Body: { sessionId: string, questionId: string, answerIndex: number | null, timeMs: number }
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: {
    sessionId?: string;
    questionId?: string;
    answerIndex?: number | null;
    timeMs?: number;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { sessionId, questionId } = body;
  if (!sessionId || !questionId) {
    return Response.json({ error: "Missing sessionId or questionId" }, { status: 400 });
  }
  const answerIndex =
    typeof body.answerIndex === "number" && body.answerIndex >= 0 ? body.answerIndex : null;
  const timeMs = Math.max(0, Math.min(300_000, Math.round(body.timeMs ?? 0)));

  const { data: session } = await supabase
    .from("sprint_sessions")
    .select("id, user_id, mode, topic, started_at, finished_at, duration_seconds")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (session.finished_at) {
    return Response.json({ error: "Session already finished" }, { status: 409 });
  }

  // Server-side clock: reject answers after the 5 minutes are up (+ grace).
  const startedAt = new Date(session.started_at).getTime();
  const elapsedMs = Date.now() - startedAt;
  const limitMs = session.duration_seconds * 1000 + SPRINT_GRACE_MS;
  if (elapsedMs > limitMs) {
    return Response.json({ error: "Time is up", timeUp: true }, { status: 410 });
  }

  const question = await getQuestionById(questionId);
  if (!question || typeof question.correctIndex !== "number") {
    return Response.json({ error: "Unknown question" }, { status: 400 });
  }

  const correct = answerIndex !== null && answerIndex === question.correctIndex;
  const points = sprintPoints(question.difficulty, timeMs, correct);

  const { error: insertError } = await supabase.from("sprint_attempts").insert({
    session_id: session.id,
    question_id: question.id,
    answer_index: answerIndex,
    correct,
    time_ms: timeMs,
    points,
  });
  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  // Next question: exclude everything already attempted in this session.
  const { data: attempted } = await supabase
    .from("sprint_attempts")
    .select("question_id")
    .eq("session_id", session.id);
  const excludeIds = new Set((attempted ?? []).map((a) => a.question_id));
  excludeIds.add(question.id);

  const next = await pickSprintQuestion({
    mode: session.mode as SprintMode,
    topic: session.topic,
    excludeIds,
    elapsedFraction: elapsedMs / (session.duration_seconds * 1000),
  });

  return Response.json({
    correct,
    correctIndex: question.correctIndex,
    points,
    question: next?.question ?? null,
  });
}
