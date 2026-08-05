"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LatexText } from "@/components/LatexText";
import { CurriculumTag } from "@/components/ui/CurriculumTag";
import { getSimpleTopic, type QuestionTableRow } from "@/lib/questionTable";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/question";

const DIFFICULTY_TEXT: Record<Difficulty, { label: string; className: string }> = {
  Easy: { label: "Easy", className: "text-[#2F7D4F]" },
  Medium: { label: "Med.", className: "text-[#C9941F]" },
  Hard: { label: "Hard", className: "text-[#C94A3D]" },
};

const ROW_GRID =
  "grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_12rem_6.5rem] items-center gap-2.5";

export function ProblemTableHeader() {
  return (
    <li
      className={`hidden md:grid ${ROW_GRID} px-4 py-2 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide`}
    >
      <span />
      <span>Question</span>
      <span className="text-right">Difficulty</span>
      <span className="text-right">Topic</span>
      <span className="text-right">Subject</span>
    </li>
  );
}

export function ProblemTableRows({
  rows,
  startIndex = 0,
}: {
  rows: QuestionTableRow[];
  /** 0-based index offset for row numbering (pagination). */
  startIndex?: number;
}) {
  return (
    <>
      {rows.map(({ question, solved }, i) => {
        const diff = DIFFICULTY_TEXT[question.difficulty];
        const num = startIndex + i + 1;
        return (
          <li key={question.id} className="border-b border-border last:border-0">
            <Link
              href={`/questions/${question.id}`}
              className={`problem-table-row grid ${ROW_GRID} px-4 py-3`}
            >
              <span className="flex h-full items-center justify-center self-stretch">
                {solved ? (
                  <CheckCircle2 className="size-4 text-[#2F7D4F]" aria-label="Solved" />
                ) : null}
              </span>

              <span className="problem-preview min-w-0 self-center text-sm font-medium text-foreground">
                <span className="text-muted-foreground">{num}.&nbsp;</span>
                <LatexText singleLine>{question.questionText}</LatexText>
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
                  {getSimpleTopic(question.topic)}
                </span>
              </span>

              <span className="hidden sm:flex h-full items-center justify-end self-stretch">
                <CurriculumTag curriculum={question.curriculum} />
              </span>
            </Link>
          </li>
        );
      })}
    </>
  );
}
