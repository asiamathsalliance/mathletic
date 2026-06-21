import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { Difficulty } from "@/types/question";
import type { BossSelfMark, PlayCategory } from "@/lib/playConfig";

export type SessionPhase = "mcq" | "boss" | "complete";

export interface McqResult {
  questionId: string;
  choiceIndex: number;
  correct: boolean;
  timedOut: boolean;
  points: number;
  timeUsedMs: number;
}

export interface PlaySessionPayload {
  sessionId: string;
  category: PlayCategory;
  mcqQuestionIds: string[];
  bossQuestionId: string;
  mcqIndex: number;
  phase: SessionPhase;
  questionStartedAt: number;
  comboMultiplier: number;
  consecutiveCorrect: number;
  maxCombo: number;
  totalMcqScore: number;
  mcqResults: McqResult[];
  mcqCorrectCount: number;
  bossStartedAt?: number;
  createdAt: number;
}

function getSecret(): string {
  return process.env.PLAY_SESSION_SECRET ?? "dev-play-session-secret-change-me";
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionPayload(
  partial: Omit<
    PlaySessionPayload,
    | "sessionId"
    | "mcqIndex"
    | "phase"
    | "comboMultiplier"
    | "consecutiveCorrect"
    | "maxCombo"
    | "totalMcqScore"
    | "mcqResults"
    | "mcqCorrectCount"
    | "createdAt"
  >
): PlaySessionPayload {
  return {
    ...partial,
    sessionId: randomUUID(),
    mcqIndex: 0,
    phase: "mcq",
    comboMultiplier: 1,
    consecutiveCorrect: 0,
    maxCombo: 1,
    totalMcqScore: 0,
    mcqResults: [],
    mcqCorrectCount: 0,
    createdAt: Date.now(),
  };
}

export function encodeSessionToken(payload: PlaySessionPayload): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function decodeSessionToken(token: string): PlaySessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = sign(encoded);
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json) as PlaySessionPayload;
  } catch {
    return null;
  }
}

export interface ClientMcqQuestion {
  id: string;
  curriculum: string;
  topic: string;
  subtopic: string;
  year: number;
  examSource: string;
  difficulty: Difficulty;
  questionText: string;
  image?: string;
  questionImage?: string;
  choices: string[];
  tags: string[];
  timeLimitMs: number;
  questionIndex: number;
  totalMcq: number;
}

export interface ClientBossQuestion {
  id: string;
  curriculum: string;
  topic: string;
  subtopic: string;
  year: number;
  examSource: string;
  difficulty: Difficulty;
  questionText: string;
  image?: string;
  questionImage?: string;
  tags: string[];
  timeLimitMs: number;
}
