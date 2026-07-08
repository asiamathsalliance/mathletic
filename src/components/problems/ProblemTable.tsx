"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { LatexText } from "@/components/LatexText";
import { CurriculumTag } from "@/components/ui/CurriculumTag";
import {
  filterQuestionsForTable,
  truncateLatex,
  getSimpleTopic,
  type TableFilters,
} from "@/lib/questionTable";
import { getAllQuestions } from "@/lib/questions";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/question";

const DIFFICULTY_TEXT: Record<Difficulty, { label: string; className: string }> = {
  Easy: { label: "Easy", className: "text-[#2F7D4F]" },
  Medium: { label: "Med.", className: "text-[#C9941F]" },
  Hard: { label: "Hard", className: "text-[#C94A3D]" },
};

export function ProblemTable() {
  const searchParams = useSearchParams();
  const allQuestions = useMemo(() => getAllQuestions(), []);

  const filters: TableFilters = useMemo(
    () => ({
      curriculum: (searchParams.get("curriculum") as TableFilters["curriculum"]) ?? "",
      topic: searchParams.get("topic") ?? "",
      difficulties: searchParams.getAll("difficulty") as Difficulty[],
      type: (searchParams.get("type") as TableFilters["type"]) ?? "all",
      status: (searchParams.get("status") as TableFilters["status"]) ?? "all",
      keyword: searchParams.get("q") ?? "",
    }),
    [searchParams]
  );

  const rows = useMemo(
    () => filterQuestionsForTable(filters, allQuestions),
    [filters, allQuestions]
  );

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        No questions match your filters.
      </p>
    );
  }

  return (
    <ul className="rounded-lg border border-border bg-card overflow-hidden">
      <li className="hidden md:grid md:grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_10rem_7rem] items-center gap-3 px-4 py-2 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <span />
        <span>Question</span>
        <span className="text-right">Difficulty</span>
        <span className="text-right">Topic</span>
        <span className="text-right">Curriculum</span>
      </li>
      {rows.map(({ question, solved }, i) => {
        const diff = DIFFICULTY_TEXT[question.difficulty];
        return (
          <li key={question.id} className="border-b border-border last:border-0">
            <Link
              href={`/questions/${question.id}`}
              className="problem-table-row grid grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_10rem_7rem] items-center gap-3 px-4 py-3"
            >
              <span className="w-5 shrink-0 flex justify-center">
                {solved && (
                  <CheckCircle2 className="size-4 text-[#2F7D4F]" aria-label="Solved" />
                )}
              </span>

              <span className="min-w-0 text-sm font-medium text-foreground">
                <span className="block truncate [mask-image:linear-gradient(to_right,black_82%,transparent)]">
                  <span className="text-muted-foreground">{i + 1}.&nbsp;</span>
                  <LatexText>{truncateLatex(question.questionText, 90)}</LatexText>
                </span>
              </span>

              <span className={cn("text-sm font-medium text-right", diff.className)}>
                {diff.label}
              </span>

              <span className="hidden md:block truncate text-xs text-muted-foreground text-right">
                {getSimpleTopic(question.topic)}
              </span>

              <span className="hidden sm:inline-flex justify-end">
                <CurriculumTag curriculum={question.curriculum} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
