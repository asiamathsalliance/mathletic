"use client";

import { PageHeading } from "@/components/PageHeading";

interface SearchPageHeadingProps {
  query: string;
  resultCount: number;
}

export function SearchPageHeading({ query, resultCount }: SearchPageHeadingProps) {
  const subtitle = query.trim()
    ? `For "${query}" — ${resultCount} question${resultCount !== 1 ? "s" : ""} found`
    : "Enter a search term to find questions (e.g. integration by parts, hard IB vector, AP calculus optimization).";

  return (
    <PageHeading
      title="Search results"
      subtitle={subtitle}
      size="sm"
    />
  );
}
