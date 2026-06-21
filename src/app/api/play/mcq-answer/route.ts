import { NextRequest } from "next/server";
import {
  MCQ_TIME_LIMITS_MS,
  TIMER_GRACE_MS,
} from "@/lib/playConfig";
import { getBasePoints, scoreMcqAnswer } from "@/lib/gameScoring";
import {
  toClientBossQuestion,
  toClientMcqQuestion,
} from "@/lib/playApiHelpers";
import {
  decodeSessionToken,
  encodeSessionToken,
} from "@/lib/playSessionToken";
import { getQuestionById } from "@/lib/questions";

export async function POST(request: NextRequest) {
  let body: { token?: string; choiceIndex?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.token || typeof body.choiceIndex !== "number") {
    return Response.json({ error: "Missing token or choiceIndex" }, { status: 400 });
  }

  const payload = decodeSessionToken(body.token);
  if (!payload || payload.phase !== "mcq") {
    return Response.json({ error: "Invalid or expired session" }, { status: 400 });
  }

  const questionId = payload.mcqQuestionIds[payload.mcqIndex];
  const question = getQuestionById(questionId);
  if (!question || typeof question.correctIndex !== "number") {
    return Response.json({ error: "Question not found" }, { status: 400 });
  }

  const now = Date.now();
  const timeLimitMs = MCQ_TIME_LIMITS_MS[question.difficulty];
  const timeUsedMs = now - payload.questionStartedAt;
  const timedOut = timeUsedMs > timeLimitMs + TIMER_GRACE_MS;
  const correct = !timedOut && body.choiceIndex === question.correctIndex;

  const { points, nextComboMultiplier, nextConsecutiveCorrect } = scoreMcqAnswer({
    correct,
    timedOut,
    timeUsedMs: Math.min(timeUsedMs, timeLimitMs),
    timeLimitMs,
    basePoints: getBasePoints(question.difficulty),
    comboMultiplier: payload.comboMultiplier,
    consecutiveCorrect: payload.consecutiveCorrect,
  });

  const mcqResult = {
    questionId,
    choiceIndex: body.choiceIndex,
    correct,
    timedOut,
    points,
    timeUsedMs: Math.min(timeUsedMs, timeLimitMs + TIMER_GRACE_MS),
  };

  const maxCombo = Math.max(payload.maxCombo, correct ? nextComboMultiplier : payload.maxCombo);
  const nextIndex = payload.mcqIndex + 1;
  const totalMcq = payload.mcqQuestionIds.length;

  const updated: typeof payload = {
    ...payload,
    mcqResults: [...payload.mcqResults, mcqResult],
    totalMcqScore: payload.totalMcqScore + points,
    mcqCorrectCount: payload.mcqCorrectCount + (correct ? 1 : 0),
    comboMultiplier: correct ? nextComboMultiplier : 1,
    consecutiveCorrect: correct ? nextConsecutiveCorrect : 0,
    maxCombo,
    mcqIndex: nextIndex,
  };

  if (nextIndex >= totalMcq) {
    const boss = getQuestionById(payload.bossQuestionId);
    if (!boss) {
      return Response.json({ error: "Boss question not found" }, { status: 400 });
    }
    updated.phase = "boss";
    updated.bossStartedAt = now;
    updated.questionStartedAt = now;

    const token = encodeSessionToken(updated);
    return Response.json({
      token,
      pointsEarned: points,
      combo: updated.comboMultiplier,
      maxCombo: updated.maxCombo,
      timedOut,
      correct,
      totalMcqScore: updated.totalMcqScore,
      phase: "boss",
      bossQuestion: toClientBossQuestion(boss),
    });
  }

  const nextQ = getQuestionById(payload.mcqQuestionIds[nextIndex]);
  if (!nextQ) {
    return Response.json({ error: "Next question not found" }, { status: 400 });
  }

  updated.questionStartedAt = now;
  const token = encodeSessionToken(updated);

  return Response.json({
    token,
    pointsEarned: points,
    combo: updated.comboMultiplier,
    maxCombo: updated.maxCombo,
    timedOut,
    correct,
    totalMcqScore: updated.totalMcqScore,
    phase: "mcq",
    nextQuestion: toClientMcqQuestion(nextQ, nextIndex, totalMcq),
  });
}
