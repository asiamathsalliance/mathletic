"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LatexText } from "@/components/LatexText";
import { CurriculumTag } from "@/components/ui/CurriculumTag";
import { getSimpleTopic } from "@/lib/questionTable";
import type { QuestionSummary } from "@/lib/questionSummary";
import { useSolvedIds } from "@/lib/useProgress";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/question";

interface SearchResultsClientProps {
  query: string;
  results: QuestionSummary[];
}

/** Same horizontal proportions as the practice-bank / LeetCode-style problem list. */
const ROW_GRID =
  "grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_12rem_6.5rem] items-center gap-2.5";

const DIFFICULTY_TEXT: Record<Difficulty, { label: string; className: string }> = {
  Easy: { label: "Easy", className: "text-[#2F7D4F]" },
  Medium: { label: "Med.", className: "text-[#C9941F]" },
  Hard: { label: "Hard", className: "text-[#C94A3D]" },
};

export function SearchResultsClient({ query, results }: SearchResultsClientProps) {
  const { solvedIds } = useSolvedIds();

  if (!query.trim()) {
    return (
      <p className="text-muted-foreground py-4">
        Use the search bar above to find questions by topic, difficulty, or keywords.
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground py-8">
        No questions matched your search. Try different keywords (e.g. topic name, curriculum, or
        difficulty).
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ul>
        <li
          className={`hidden md:grid ${ROW_GRID} border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}
        >
          <span />
          <span>Question</span>
          <span className="text-right">Difficulty</span>
          <span className="text-right">Topic</span>
          <span className="text-right">Subject</span>
        </li>

        {results.map((q, i) => {
          const solved = solvedIds.has(q.id);
          const diff = DIFFICULTY_TEXT[q.difficulty];
          const href = `/questions/${q.id}?from=${encodeURIComponent(`/search?q=${query}`)}`;

          return (
            <li key={q.id} className="border-b border-border last:border-0">
              <Link
                href={href}
                className={`problem-table-row grid ${ROW_GRID} cursor-pointer px-4 py-3`}
              >
                <span className="flex h-full items-center justify-center self-stretch">
                  {solved ? (
                    <CheckCircle2 className="size-4 text-[#2F7D4F]" aria-label="Solved" />
                  ) : null}
                </span>

                <span className="problem-preview min-w-0 self-center text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">{i + 1}.&nbsp;</span>
                  <LatexText singleLine>{q.preview}</LatexText>
                </span>

                <span
                  className={cn(
                    "flex h-full items-center justify-end self-stretch text-sm font-medium",
                    diff.className
                  )}
                >
                  {diff.label}
                </span>

                <span className="hidden md:flex h-full min-w-0 items-center justify-end self-stretch">
                  <span className="block max-w-full truncate text-xs leading-normal text-muted-foreground">
                    {getSimpleTopic(q.topic)}
                  </span>
                </span>

                <span className="hidden sm:flex h-full items-center justify-end self-stretch">
                  <CurriculumTag curriculum={q.curriculum} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
