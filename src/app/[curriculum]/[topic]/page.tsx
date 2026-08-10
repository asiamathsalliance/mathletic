import { notFound } from "next/navigation";
import { TopicPageClient } from "./TopicPageClient";
import {
  TOPICS_BY_CURRICULUM,
  DIFFICULTIES,
  FILTER_YEARS,
  type Curriculum,
} from "@/types/question";
import { getQuestionsByTopic } from "@/lib/questions";

const SLUG_TO_CURRICULUM: Record<string, Curriculum> = {
  hsc: "HSC",
  ib: "IB",
  ap: "AP",
  "a-level": "A-Level",
};

const TOPIC_SLUG_TO_NAME: Record<string, string> = {};
(Object.values(TOPICS_BY_CURRICULUM).flat() as string[]).forEach((t) => {
  TOPIC_SLUG_TO_NAME[t.toLowerCase().replace(/\s+/g, "-")] = t;
});

interface PageProps {
  params: Promise<{ curriculum: string; topic: string }>;
  searchParams: Promise<{ difficulty?: string; year?: string; type?: string; source?: string }>;
}

export default async function TopicPage({ params, searchParams }: PageProps) {
  const { curriculum: curriculumSlug, topic: topicSlug } = await params;
  const curriculum = SLUG_TO_CURRICULUM[curriculumSlug?.toLowerCase() ?? ""];
  const topicName = topicSlug
    ? TOPIC_SLUG_TO_NAME[topicSlug.toLowerCase()]
    : undefined;

  if (!curriculum || !topicName) notFound();

  const filters = await searchParams;
  const typeFilter = filters.type === "mcq" || filters.type === "long" ? filters.type : null;
  const topicQuestions = await getQuestionsByTopic({ topic: topicName, curriculum });
  const questions = topicQuestions.filter(
    (q) =>
      (filters.difficulty ? q.difficulty === filters.difficulty : true) &&
      (filters.year ? String(q.year) === filters.year : true) &&
      (filters.source ? q.examSource === filters.source : true) &&
      (typeFilter === null ||
        (typeFilter === "mcq" && q.choices && q.choices.length > 0) ||
        (typeFilter === "long" && (!q.choices || q.choices.length === 0)))
  );

  return (
    <TopicPageClient
      curriculum={curriculum}
      topicName={topicName}
      questions={questions}
      difficultyOptions={[...DIFFICULTIES]}
      yearOptions={[...FILTER_YEARS]}
      currentFilters={filters}
    />
  );
}
