import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getQuestionById } from "@/lib/questions";
import { pickProblemPoolQuestion } from "@/lib/sprintProblemPool";
import {
  generateOperandPair,
  validateAnswer,
  validateOperands,
} from "@/lib/sprintMultiplication";
import {
  SPRINT_GRACE_MS,
  answerLetter,
  currentStreakBefore,
  multiplicationPoints,
  problemPoolPoints,
  type SprintModeType,
} from "@/lib/sprint";

async function getSessionElapsed(
  startedAt: string,
  durationSeconds: number
): Promise<{ elapsedMs: number; timeUp: boolean }> {
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const limitMs = durationSeconds * 1000 + SPRINT_GRACE_MS;
  return { elapsedMs, timeUp: elapsedMs > limitMs };
}

async function getAttemptOrderIndex(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<number> {
  const { count } = await supabase
    .from("sprint_attempts")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  return count ?? 0;
}

async function getPriorCorrectFlags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<boolean[]> {
  const { data } = await supabase
    .from("sprint_attempts")
    .select("correct")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });
  return (data ?? []).map((a) => a.correct);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId as string | undefined;
  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("sprint_sessions")
    .select("id, user_id, mode_type, started_at, ended_at, duration_seconds, is_complete")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
  if (session.is_complete || session.ended_at) {
    return Response.json({ error: "Session already finished" }, { status: 409 });
  }

  const { elapsedMs, timeUp } = await getSessionElapsed(
    session.started_at,
    session.duration_seconds
  );
  if (timeUp) {
    return Response.json({ error: "Time is up", timeUp: true }, { status: 410 });
  }

  const modeType = session.mode_type as SprintModeType;
  const orderIndex = await getAttemptOrderIndex(supabase, session.id);
  const priorCorrect = await getPriorCorrectFlags(supabase, session.id);
  const streakBefore = currentStreakBefore(priorCorrect);

  if (modeType === "MULTIPLICATION") {
    const operandA = Number(body.operandA);
    const operandB = Number(body.operandB);
    const userAnswerValue = Number(body.userAnswerValue);
    const timeTakenSeconds = Math.max(
      0,
      Math.min(session.duration_seconds, Number(body.timeTakenSeconds) || 0)
    );

    if (!validateOperands(operandA, operandB)) {
      return Response.json({ error: "Invalid operands" }, { status: 400 });
    }
    if (!Number.isFinite(userAnswerValue)) {
      return Response.json({ error: "Invalid answer" }, { status: 400 });
    }

    const correct = validateAnswer(operandA, operandB, userAnswerValue);
    const points = multiplicationPoints(correct, streakBefore);
    const timeMs = Math.round(timeTakenSeconds * 1000);

    const { error: insertError } = await supabase.from("sprint_attempts").insert({
      session_id: session.id,
      question_id: null,
      operand_a: operandA,
      operand_b: operandB,
      user_answer_value: userAnswerValue,
      answer_index: null,
      correct,
      time_ms: timeMs,
      time_taken_seconds: timeTakenSeconds,
      points,
      order_index: orderIndex,
    });
    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    const newStreak = correct ? streakBefore + 1 : 0;
    const nextProblem = generateOperandPair();

    return Response.json({
      correct,
      points,
      currentStreak: newStreak,
      nextProblem,
    });
  }

  // PROBLEM_POOL
  const questionId = body.questionId as string | undefined;
  const answerIndex =
    typeof body.answerIndex === "number" && body.answerIndex >= 0
      ? body.answerIndex
      : null;
  const timeTakenSeconds = Math.max(
    0,
    Math.min(session.duration_seconds, Number(body.timeTakenSeconds) || 0)
  );

  if (!questionId) {
    return Response.json({ error: "Missing questionId" }, { status: 400 });
  }

  const question = await getQuestionById(questionId);
  if (!question || typeof question.correctIndex !== "number") {
    return Response.json({ error: "Unknown question" }, { status: 400 });
  }

  const correct = answerIndex !== null && answerIndex === question.correctIndex;
  const points = problemPoolPoints(correct, timeTakenSeconds);
  const timeMs = Math.round(timeTakenSeconds * 1000);
  const selectedAnswer = answerIndex !== null ? answerLetter(answerIndex) : null;

  const { error: insertError } = await supabase.from("sprint_attempts").insert({
    session_id: session.id,
    question_id: question.id,
    operand_a: null,
    operand_b: null,
    user_answer_value: null,
    answer_index: answerIndex,
    selected_answer: selectedAnswer,
    correct,
    time_ms: timeMs,
    time_taken_seconds: timeTakenSeconds,
    points,
    order_index: orderIndex,
  });
  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  const { data: attempted } = await supabase
    .from("sprint_attempts")
    .select("question_id")
    .eq("session_id", session.id);
  const excludeIds = new Set(
    (attempted ?? []).map((a) => a.question_id).filter(Boolean) as string[]
  );

  const next = await pickProblemPoolQuestion(excludeIds);

  return Response.json({
    correct,
    correctIndex: question.correctIndex,
    points,
    question: next?.question ?? null,
  });
}
