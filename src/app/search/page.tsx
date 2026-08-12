import { redirect } from "next/navigation";
import { SearchResultsClient } from "./SearchResultsClient";
import { SearchPageHeading } from "@/components/SearchPageHeading";
import {
  searchQuestionSummaries,
  getSummariesByFilters,
  getQuestionById,
} from "@/lib/questions";

interface PageProps {
  searchParams: Promise<{ q?: string; curriculum?: string; topic?: string; difficulty?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { q = "", curriculum, topic, difficulty } = params;

  const hasExplicitFilters = Boolean(curriculum || topic || difficulty);
  const trimmed = q.trim();

  // Exact id match → open the question (MCQ) directly, not a one-row results list.
  if (trimmed && !hasExplicitFilters) {
    const byId = await getQuestionById(trimmed);
    if (byId) {
      redirect(`/questions/${byId.id}?from=${encodeURIComponent("/search")}`);
    }
  }

  const results = hasExplicitFilters
    ? await getSummariesByFilters({
        curriculum,
        topic,
        difficulty,
        keyword: trimmed || undefined,
      })
    : trimmed
      ? await searchQuestionSummaries(trimmed)
      : [];

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <SearchPageHeading query={q} resultCount={results.length} />
      <SearchResultsClient query={q} results={results} />
    </div>
  );
}
