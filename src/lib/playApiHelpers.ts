import type { Question } from "@/types/question";
import {
  BOSS_TIME_LIMITS_MS,
  MCQ_TIME_LIMITS_MS,
  type PlayCategory,
} from "@/lib/playConfig";
import type {
  ClientBossQuestion,
  ClientMcqQuestion,
  PlaySessionPayload,
} from "@/lib/playSessionToken";

export function toClientMcqQuestion(
  q: Question,
  questionIndex: number,
  totalMcq: number
): ClientMcqQuestion {
  return {
    id: q.id,
    curriculum: q.curriculum,
    topic: q.topic,
    subtopic: q.subtopic,
    year: q.year,
    examSource: q.examSource,
    difficulty: q.difficulty,
    questionText: q.questionText,
    image: q.image,
    questionImage: q.questionImage,
    choices: q.choices ?? [],
    tags: q.tags,
    timeLimitMs: MCQ_TIME_LIMITS_MS[q.difficulty],
    questionIndex,
    totalMcq,
  };
}

export function toClientBossQuestion(q: Question): ClientBossQuestion {
  return {
    id: q.id,
    curriculum: q.curriculum,
    topic: q.topic,
    subtopic: q.subtopic,
    year: q.year,
    examSource: q.examSource,
    difficulty: q.difficulty,
    questionText: q.questionText,
    image: q.image,
    questionImage: q.questionImage,
    tags: q.tags,
    timeLimitMs: BOSS_TIME_LIMITS_MS[q.difficulty],
  };
}

export interface SessionStartResponse {
  token: string;
  category: PlayCategory;
  question: ClientMcqQuestion;
  combo: number;
}

export interface McqAnswerResponse {
  token: string;
  pointsEarned: number;
  combo: number;
  maxCombo: number;
  timedOut: boolean;
  correct: boolean;
  totalMcqScore: number;
  phase: "mcq" | "boss";
  nextQuestion?: ClientMcqQuestion;
  bossQuestion?: ClientBossQuestion;
}

export interface BossCompleteResponse {
  token: string;
  mcqScore: number;
  bossScore: number;
  bossTimeBonus: number;
  totalXp: number;
  maxCombo: number;
  mcqCorrect: number;
  mcqTotal: number;
  accuracy: number;
  totalTimeMs: number;
  bossCorrect: boolean;
}

export function buildSessionSummary(payload: PlaySessionPayload, bossXp: number, bossTimeBonus: number, bossCorrect: boolean): Omit<BossCompleteResponse, "token"> {
  const mcqTotal = payload.mcqQuestionIds.length;
  const mcqCorrect = payload.mcqCorrectCount;
  const accuracy = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;
  const mcqTime = payload.mcqResults.reduce((s, r) => s + r.timeUsedMs, 0);
  const bossTime = payload.bossStartedAt ? Date.now() - payload.bossStartedAt : 0;
  return {
    mcqScore: payload.totalMcqScore,
    bossScore: bossXp,
    bossTimeBonus,
    totalXp: payload.totalMcqScore + bossXp + bossTimeBonus,
    maxCombo: payload.maxCombo,
    mcqCorrect,
    mcqTotal,
    accuracy,
    totalTimeMs: mcqTime + bossTime,
    bossCorrect,
  };
}
