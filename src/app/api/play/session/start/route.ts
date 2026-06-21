import { NextRequest } from "next/server";
import {
  DEFAULT_MCQ_COUNT,
  type PlayCategory,
} from "@/lib/playConfig";
import { toClientMcqQuestion } from "@/lib/playApiHelpers";
import {
  createSessionPayload,
  encodeSessionToken,
} from "@/lib/playSessionToken";
import { pickSessionQuestions } from "@/lib/questions";

function parseCategory(value: unknown): PlayCategory | null {
  if (value === "HSC" || value === "IB" || value === "A-Level") return value;
  return null;
}

export async function POST(request: NextRequest) {
  let body: {
    category?: string;
    topic?: string;
    difficulty?: string;
    mcqCount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = parseCategory(body.category);
  if (!category) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const mcqCount = Math.min(Math.max(body.mcqCount ?? DEFAULT_MCQ_COUNT, 1), 20);
  const seed = Date.now();
  const { mcq, boss } = pickSessionQuestions(
    category,
    { topic: body.topic, difficulty: body.difficulty },
    mcqCount,
    seed
  );

  if (mcq.length === 0 || !boss) {
    return Response.json(
      {
        error: "Insufficient questions",
        message:
          "Not enough MCQ and long-answer questions for this filter. Try broader topic or difficulty settings.",
      },
      { status: 422 }
    );
  }

  const now = Date.now();
  const payload = createSessionPayload({
    category,
    mcqQuestionIds: mcq.map((q) => q.id),
    bossQuestionId: boss.id,
    questionStartedAt: now,
  });

  const token = encodeSessionToken(payload);
  const first = mcq[0];

  return Response.json({
    token,
    category,
    question: toClientMcqQuestion(first, 0, mcq.length),
    combo: payload.comboMultiplier,
  });
}
