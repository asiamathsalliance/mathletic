import { notFound } from "next/navigation";
import { TopicPageClient } from "../TopicPageClient";
import {
  DIFFICULTIES,
  FILTER_YEARS,
  type Curriculum,
} from "@/types/question";
import { getStreamBySlug, slugToTopicName } from "@/lib/curriculumStreams";
import { getAllQuestions } from "@/lib/questions";
import type { Question } from "@/types/question";

const SLUG_TO_CURRICULUM: Record<string, Curriculum> = {
  hsc: "HSC",
  ib: "IB",
  ap: "AP",
  "a-level": "A-Level",
};

interface PageProps {
  params: Promise<{ curriculum: string; topic: string; topicSlug: string }>;
  searchParams: Promise<{ difficulty?: string; year?: string; type?: string }>;
}

/** Stream + topic page: /ib/hl/calculus (topic=stream slug, topicSlug=topic slug) */
export default async function StreamTopicPage({ params, searchParams }: PageProps) {
  const { curriculum: curriculumSlug, topic: streamSlug, topicSlug } = await params;
  const curriculum = SLUG_TO_CURRICULUM[curriculumSlug?.toLowerCase() ?? ""] as Curriculum | undefined;
  if (!curriculum) notFound();

  const stream = getStreamBySlug(curriculum, streamSlug);
  if (!stream) notFound();

  const topicName = slugToTopicName(topicSlug ?? "", stream.topics);
  if (!topicName) notFound();

  const filters = await searchParams;
  const difficultyParam = filters.difficulty;
  const difficultyArr =
    difficultyParam == null
      ? []
      : Array.isArray(difficultyParam)
        ? difficultyParam.map((s) => String(s).trim()).filter(Boolean)
        : String(difficultyParam).split(",").map((s) => s.trim()).filter(Boolean);
  const difficultySet = difficultyArr.length > 0 ? new Set(difficultyArr) : null;
  const yearFrom = filters.year ? parseInt(filters.year, 10) : null;
  const typeFilter = filters.type === "mcq" || filters.type === "long" ? filters.type : null;

  const allQuestions = getAllQuestions();
  const questions = allQuestions.filter(
    (q) =>
      q.curriculum === curriculum &&
      q.topic === topicName &&
      (q.stream === undefined || q.stream === stream.id) &&
      (difficultySet === null || difficultySet.size === 0 || difficultySet.has(q.difficulty)) &&
      (yearFrom == null || Number.isNaN(yearFrom) || q.year >= yearFrom) &&
      (typeFilter === null ||
        (typeFilter === "mcq" && q.choices && q.choices.length > 0) ||
        (typeFilter === "long" && (!q.choices || q.choices.length === 0)))
  );

  const displayTopic = `${topicName} (${stream.label})`;

  return (
    <TopicPageClient
      curriculum={curriculum}
      topicName={displayTopic}
      questions={questions}
      difficultyOptions={[...DIFFICULTIES]}
      yearOptions={[...FILTER_YEARS]}
      currentFilters={filters}
    />
  );
}
