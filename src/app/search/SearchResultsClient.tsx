"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { CurriculumTag } from "@/components/ui/CurriculumTag";
import { LatexText } from "@/components/LatexText";
import { stripLatexPreview } from "@/lib/questionTable";
import { isQuestionSolved } from "@/lib/progress";
import { isMcqQuestion } from "@/lib/questions";
import type { Question } from "@/types/question";

interface SearchResultsClientProps {
  query: string;
  results: Question[];
}

export function SearchResultsClient({ query, results }: SearchResultsClientProps) {
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
    <>
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-meta">
              <th className="px-4 py-3 w-10 font-medium"> </th>
              <th className="px-4 py-3 font-medium normal-case tracking-normal text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 w-24 font-medium normal-case tracking-normal text-muted-foreground">
                Difficulty
              </th>
              <th className="px-4 py-3 w-24 font-medium normal-case tracking-normal text-muted-foreground">
                Curriculum
              </th>
              <th className="px-4 py-3 font-medium normal-case tracking-normal text-muted-foreground">
                Topic
              </th>
              <th className="px-4 py-3 w-16 font-medium normal-case tracking-normal text-muted-foreground">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((q) => {
              const solved = isQuestionSolved(q.id);
              const type = isMcqQuestion(q) ? "MCQ" : "Long";
              return (
                <tr key={q.id} className="problem-table-row border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    {solved ? (
                      <CheckCircle2 className="size-4 text-[#2F7D4F]" aria-label="Solved" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" aria-label="Unsolved" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/questions/${q.id}`} className="hover:text-primary line-clamp-1">
                      {stripLatexPreview(q.questionText)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <DifficultyBadge difficulty={q.difficulty} />
                  </td>
                  <td className="px-4 py-3">
                    <CurriculumTag curriculum={q.curriculum} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{q.topic}</td>
                  <td className="px-4 py-3 text-muted-foreground">{type}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-2">
        {results.map((q) => {
          const solved = isQuestionSolved(q.id);
          const type = isMcqQuestion(q) ? "MCQ" : "Long";
          return (
            <li key={q.id}>
              <Link
                href={`/questions/${q.id}`}
                className="block rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {solved ? (
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-[#2F7D4F]" />
                  ) : (
                    <Circle className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium line-clamp-2">
                      <LatexText>{q.questionText}</LatexText>
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <DifficultyBadge difficulty={q.difficulty} />
                      <CurriculumTag curriculum={q.curriculum} />
                      <span className="text-meta normal-case tracking-normal">{q.topic}</span>
                      <span className="text-meta normal-case tracking-normal">{type}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
