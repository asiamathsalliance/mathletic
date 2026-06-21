import { NextRequest } from "next/server";
import {
  BOSS_TIME_LIMITS_MS,
  TIMER_GRACE_MS,
  type BossSelfMark,
} from "@/lib/playConfig";
import { scoreBossAnswer } from "@/lib/gameScoring";
import { buildSessionSummary } from "@/lib/playApiHelpers";
import { decodeSessionToken, encodeSessionToken } from "@/lib/playSessionToken";
import { getQuestionById } from "@/lib/questions";

function parseSelfMark(value: unknown): BossSelfMark | null {
  if (value === "incorrect" || value === "partial" || value === "correct") return value;
  return null;
}

export async function POST(request: NextRequest) {
  let body: { token?: string; selfMark?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const selfMark = parseSelfMark(body.selfMark);
  if (!body.token || !selfMark) {
    return Response.json({ error: "Missing token or selfMark" }, { status: 400 });
  }

  const payload = decodeSessionToken(body.token);
  if (!payload || payload.phase !== "boss") {
    return Response.json({ error: "Invalid session or not in boss phase" }, { status: 400 });
  }

  const boss = getQuestionById(payload.bossQuestionId);
  if (!boss || !payload.bossStartedAt) {
    return Response.json({ error: "Boss question not found" }, { status: 400 });
  }

  const now = Date.now();
  const timeLimitMs = BOSS_TIME_LIMITS_MS[boss.difficulty];
  const timeUsedMs = now - payload.bossStartedAt;

  if (timeUsedMs > timeLimitMs + TIMER_GRACE_MS) {
    return Response.json(
      { error: "Time expired", message: "Boss check time limit exceeded." },
      { status: 400 }
    );
  }

  const { baseXp, timeBonus } = scoreBossAnswer({
    selfMark,
    timeUsedMs,
    timeLimitMs,
  });

  const completed = {
    ...payload,
    phase: "complete" as const,
  };

  const token = encodeSessionToken(completed);
  const bossCorrect = selfMark === "correct";
  const summary = buildSessionSummary(completed, baseXp, timeBonus, bossCorrect);

  return Response.json({
    token,
    ...summary,
    category: payload.category,
  });
}
