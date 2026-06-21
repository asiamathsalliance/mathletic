"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { PageHeading } from "@/components/PageHeading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Question } from "@/types/question";
import { isQuestionSolved } from "@/lib/progress";

interface TopicPageClientProps {
  curriculum: string;
  topicName: string;
  questions: Question[];
  difficultyOptions: string[];
  yearOptions: number[];
  currentFilters: { difficulty?: string; year?: string; type?: string; completion?: string };
}

function parseDifficultyFilter(d: string | undefined): Set<string> {
  if (!d || typeof d !== "string") return new Set();
  return new Set(d.split(",").map((s) => s.trim()).filter(Boolean));
}

function parseCompletionFilter(value: string | undefined): Set<"non-complete" | "complete"> {
  const set = new Set<"non-complete" | "complete">();
  if (!value) {
    set.add("non-complete");
    return set;
  }
  value
    .split(",")
    .map((s) => s.trim())
    .forEach((v) => {
      if (v === "non-complete" || v === "complete") {
        set.add(v);
      }
    });
  if (set.size === 0) {
    set.add("non-complete");
  }
  return set;
}

export function TopicPageClient({
  curriculum,
  topicName,
  questions,
  difficultyOptions,
  yearOptions,
  currentFilters,
}: TopicPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const difficultyRef = useRef<HTMLDivElement>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const completionRef = useRef<HTMLDivElement>(null);

  const selectedDifficulties = parseDifficultyFilter(currentFilters.difficulty);
  const selectedCompletion = parseCompletionFilter(currentFilters.completion);
  const hasExplicitCompletion = Boolean(currentFilters.completion && currentFilters.completion.trim());

  const updateFilter = useCallback(
    (key: "difficulty" | "year" | "type" | "completion", value: string) => {
      const params = new URLSearchParams();
      if (key === "difficulty") {
        if (value) params.set("difficulty", value);
      } else if (key === "year") {
        if (value) params.set("year", value);
      } else if (key === "type") {
        if (value && value !== "all") params.set("type", value);
      } else if (key === "completion") {
        if (value) params.set("completion", value);
      }
      if (key !== "difficulty" && currentFilters.difficulty)
        params.set("difficulty", currentFilters.difficulty);
      if (key !== "year" && currentFilters.year)
        params.set("year", currentFilters.year);
      if (key !== "type" && currentFilters.type)
        params.set("type", currentFilters.type);
      if (key !== "completion" && currentFilters.completion)
        params.set("completion", currentFilters.completion);
      if (from) params.set("from", from);
      const qs = params.toString();
      router.push(pathname + (qs ? `?${qs}` : ""));
    },
    [router, pathname, currentFilters, from]
  );

  const toggleDifficulty = useCallback(
    (d: string) => {
      const next = new Set(selectedDifficulties);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      const ordered = difficultyOptions.filter((opt) => next.has(opt)).join(",");
      updateFilter("difficulty", ordered);
    },
    [selectedDifficulties, difficultyOptions, updateFilter]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (difficultyRef.current && !difficultyRef.current.contains(target)) {
        setDifficultyOpen(false);
      }
      if (completionRef.current && !completionRef.current.contains(target)) {
        setCompletionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const difficultyDisplay =
    selectedDifficulties.size === 0
      ? null
      : difficultyOptions.filter((d) => selectedDifficulties.has(d)).join(", ");

  const completionDisplay =
    !hasExplicitCompletion
      ? "Completion"
      : selectedCompletion.size === 0 || selectedCompletion.size === 2
        ? "All"
        : Array.from(selectedCompletion)
            .map((v) => (v === "non-complete" ? "Non-complete" : "Complete"))
            .join(", ");

  const visibleQuestions = useMemo(() => {
    // If both selected, show all
    if (selectedCompletion.size === 0 || selectedCompletion.size === 2) {
      return questions;
    }
    const wantNonComplete = selectedCompletion.has("non-complete");
    const wantComplete = selectedCompletion.has("complete");
    return questions.filter((q) => {
      const solved = isQuestionSolved(q.id);
      if (solved && wantComplete) return true;
      if (!solved && wantNonComplete) return true;
      return false;
    });
  }, [questions, selectedCompletion]);

  return (
    <div className="space-y-6">
      <PageHeading
        title={topicName}
        subtitle={`${curriculum} · Past exam questions`}
      />

      <div className="flex flex-wrap gap-4 items-center">
        <span className="text-sm font-medium text-muted-foreground">
          Filters:
        </span>
        <div className="relative" ref={difficultyRef}>
          <Button
            variant="outline"
            className="w-[180px] justify-between"
            onClick={() => setDifficultyOpen((o) => !o)}
          >
            <span
              className={
                difficultyDisplay == null ? "truncate text-muted-foreground" : "truncate"
              }
            >
              {difficultyDisplay ?? "Difficulty"}
            </span>
            <span className="shrink-0 opacity-50">
              {difficultyOpen ? "▲" : "▼"}
            </span>
          </Button>
          {difficultyOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-[180px] rounded-lg border border-border bg-popover p-2 shadow-md">
              {difficultyOptions.map((d) => (
                <label
                  key={d}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedDifficulties.has(d)}
                    onChange={() => toggleDifficulty(d)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={completionRef}>
          <Button
            variant="outline"
            className="w-[180px] justify-between"
            onClick={() => setCompletionOpen((o) => !o)}
          >
            <span
              className={
                hasExplicitCompletion ? "truncate" : "truncate text-muted-foreground"
              }
            >
              {completionDisplay}
            </span>
            <span className="shrink-0 opacity-50">
              {completionOpen ? "▲" : "▼"}
            </span>
          </Button>
          {completionOpen && (
            <div className="absolute top-full left-0 z-50 mt-1 w-[180px] rounded-lg border border-border bg-popover p-2 shadow-md">
              {(["non-complete", "complete"] as const).map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCompletion.has(value)}
                    onChange={() => {
                      const next = new Set(selectedCompletion);
                      if (next.has(value)) next.delete(value);
                      else next.add(value);
                      const ordered: ("non-complete" | "complete")[] = [
                        "non-complete",
                        "complete",
                      ];
                      const joined = ordered.filter((v) => next.has(v)).join(",");
                      updateFilter("completion", joined);
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">
                    {value === "non-complete" ? "Non-complete" : "Complete"}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <Select
          value={currentFilters.year ?? "all"}
          onValueChange={(v) => updateFilter("year", v === "all" || v == null ? "" : v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y} onward
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={currentFilters.type ?? "all"}
          onValueChange={(v) => updateFilter("type", v === "all" || v == null ? "" : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Question type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="mcq">MCQ</SelectItem>
            <SelectItem value="long">Long answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {visibleQuestions.length === 0 ? (
          <p className="text-muted-foreground py-8">
            No questions match the current filters. Try adjusting filters or
            check back later for more content.
          </p>
        ) : (
          visibleQuestions.map((q) => <QuestionCard key={q.id} question={q} />)
        )}
      </div>
    </div>
  );
}
