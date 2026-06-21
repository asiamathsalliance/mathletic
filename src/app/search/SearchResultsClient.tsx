"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { LatexText } from "@/components/LatexText";
import type { Question } from "@/types/question";
import { getStreamIdForTopic, topicToSlug } from "@/lib/curriculumStreams";
import { CURRICULUM_STREAMS } from "@/lib/curriculumStreams";
import type { Curriculum } from "@/types/question";

const CURRICULUM_SLUG: Record<string, string> = {
  HSC: "hsc",
  IB: "ib",
  AP: "ap",
};

function topicPageHref(q: Question): string {
  const curriculumSlug = CURRICULUM_SLUG[q.curriculum] ?? q.curriculum.toLowerCase();
  const streamId = getStreamIdForTopic(q.curriculum as Curriculum, q.topic)
    ?? CURRICULUM_STREAMS[q.curriculum as Curriculum]?.[0]?.id
    ?? "advanced";
  const topicSlug = topicToSlug(q.topic);
  return `/${curriculumSlug}/${streamId}/${topicSlug}`;
}

interface SearchResultsClientProps {
  query: string;
  results: Question[];
}

export function SearchResultsClient({ query, results }: SearchResultsClientProps) {
  if (!query.trim()) {
    return (
      <p className="text-muted-foreground py-4">
        Use the search bar above to find questions by topic, difficulty, or
        keywords.
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground py-8">
        No questions matched your search. Try different keywords (e.g. topic
        name, curriculum, or difficulty).
      </p>
    );
  }

  const searchResultsUrl = `/search?q=${encodeURIComponent(query.trim())}`;

  return (
    <ul className="space-y-4">
      {results.map((q) => {
        const baseHref = topicPageHref(q);
        const href = `${baseHref}?from=${encodeURIComponent(searchResultsUrl)}`;
        return (
          <li key={q.id}>
            <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl">
              <Card className="transition-all hover:shadow-md hover:border-primary/30 hover:bg-primary/5">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {q.curriculum} {q.year} {q.examSource}
                    </span>
                    <span>·</span>
                    <span>Topic: {q.topic}</span>
                    <span>·</span>
                    <span
                      className={
                        q.difficulty === "Hard"
                          ? "text-red-600"
                          : q.difficulty === "Medium"
                            ? "text-amber-600"
                            : "text-green-600"
                      }
                    >
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="line-clamp-2 text-sm text-foreground mt-1">
                    <LatexText block>{q.questionText}</LatexText>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-primary text-sm font-medium">
                    View in {q.topic} →
                  </span>
                </CardContent>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
