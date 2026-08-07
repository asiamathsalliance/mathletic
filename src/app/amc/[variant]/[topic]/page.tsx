import { notFound } from "next/navigation";
import { TopicPageClient } from "@/app/[curriculum]/[topic]/TopicPageClient";
import { DIFFICULTIES, FILTER_YEARS } from "@/types/question";
import { AMC_BROWSE_TOPICS } from "@/lib/competitions";
import { topicToSlug, slugToTopicName } from "@/lib/curriculumStreams";
import { getAllQuestions } from "@/lib/questions";

const VARIANT_META = {
  "10": { competition: "AMC10" as const, label: "AMC 10" },
  "12": { competition: "AMC12" as const, label: "AMC 12" },
};

interface PageProps {
  params: Promise<{ variant: string; topic: string }>;
  searchParams: Promise<{
    difficulty?: string;
    year?: string;
    type?: string;
    completion?: string;
    from?: string;
  }>;
}

export function generateStaticParams() {
  const topics = AMC_BROWSE_TOPICS.map((t) => topicToSlug(t));
  return (["10", "12"] as const).flatMap((variant) =>
    topics.map((topic) => ({ variant, topic }))
  );
}

export default async function AmcTopicPage({ params, searchParams }: PageProps) {
  const { variant, topic: topicSlug } = await params;
  const meta = VARIANT_META[variant as keyof typeof VARIANT_META];
  if (!meta) notFound();

  const topicName = slugToTopicName(topicSlug ?? "", [...AMC_BROWSE_TOPICS]);
  if (!topicName) notFound();

  const filters = await searchParams;
  const difficultyParam = filters.difficulty;
  const difficultyArr =
    difficultyParam == null
      ? []
      : Array.isArray(difficultyParam)
        ? difficultyParam.map((s) => String(s).trim()).filter(Boolean)
        : String(difficultyParam)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
  const difficultySet = difficultyArr.length > 0 ? new Set(difficultyArr) : null;
  const yearFrom = filters.year ? parseInt(filters.year, 10) : null;
  const typeFilter = filters.type === "mcq" || filters.type === "long" ? filters.type : null;

  const allQuestions = await getAllQuestions();
  const questions = allQuestions.filter(
    (q) =>
      (q.competition === meta.competition || q.curriculum === meta.label) &&
      q.topic === topicName &&
      (difficultySet === null || difficultySet.size === 0 || difficultySet.has(q.difficulty)) &&
      (yearFrom == null || Number.isNaN(yearFrom) || q.year >= yearFrom) &&
      (typeFilter === null ||
        (typeFilter === "mcq" && q.choices && q.choices.length > 0) ||
        (typeFilter === "long" && (!q.choices || q.choices.length === 0)))
  );

  return (
    <TopicPageClient
      curriculum={meta.label}
      topicName={topicName}
      questions={questions}
      difficultyOptions={[...DIFFICULTIES]}
      yearOptions={[...FILTER_YEARS]}
      currentFilters={filters}
    />
  );
}
