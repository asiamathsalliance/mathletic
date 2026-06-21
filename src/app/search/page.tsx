import { SearchResultsClient } from "./SearchResultsClient";
import { SearchPageHeading } from "@/components/SearchPageHeading";
import { searchQuestionsAI, getQuestionsByFilters, getQuestionById } from "@/lib/questions";

interface PageProps {
  searchParams: Promise<{ q?: string; curriculum?: string; topic?: string; difficulty?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { q = "", curriculum, topic, difficulty } = params;

  const hasExplicitFilters = Boolean(curriculum || topic || difficulty);
  const byId = q.trim() ? getQuestionById(q.trim()) : undefined;
  const results = byId
    ? [byId]
    : hasExplicitFilters
      ? getQuestionsByFilters({
          curriculum,
          topic,
          difficulty,
          keyword: q.trim() || undefined,
        })
      : q.trim()
        ? searchQuestionsAI(q.trim())
        : [];

  return (
    <div className="space-y-6">
      <SearchPageHeading query={q} resultCount={results.length} />
      <SearchResultsClient query={q} results={results} />
    </div>
  );
}
