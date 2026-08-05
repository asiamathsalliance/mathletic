import type { Question, Competition } from "@/types/question";
import questionsHsc from "@/data/questions-hsc.json";
import questionsIb from "@/data/questions-ib.json";
import questionsAp from "@/data/questions-ap.json";
import questionsAlevel from "@/data/questions-alevel.json";
import questionsAmc from "@/data/questions-amc.json";
import { getSimpleTopic } from "@/lib/questionTable";

const LABEL_FROM_CURRICULUM: Record<string, Competition> = {
  HSC: "HSC",
  IB: "IB",
  AP: "AP",
  "A-Level": "A_LEVEL",
  "AMC 10": "AMC10",
  "AMC 12": "AMC12",
};

/** Bundled question bank for sync topic pills and topic-board filtering. */
export const BUNDLED_QUESTIONS: Question[] = [
  ...(questionsAmc as Question[]),
  ...(questionsHsc as Question[]),
  ...(questionsIb as Question[]),
  ...(questionsAp as Question[]),
  ...(questionsAlevel as Question[]),
].map((q) => ({
  ...q,
  competition: q.competition ?? LABEL_FROM_CURRICULUM[q.curriculum],
}));

export const LEADERBOARD_TOPICS: string[] = [
  ...new Set(BUNDLED_QUESTIONS.map((q) => getSimpleTopic(q.topic))),
].sort();

export const TOPIC_BY_QUESTION_ID = new Map(
  BUNDLED_QUESTIONS.map((q) => [q.id, getSimpleTopic(q.topic)])
);
