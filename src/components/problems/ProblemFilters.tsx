"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Filter, Search, X } from "lucide-react";
import { getSimpleTopics } from "@/lib/questionTable";
import { getAllQuestions } from "@/lib/questions";
import { isQuestionSolved } from "@/lib/progress";
import { CURRICULA, DIFFICULTIES } from "@/types/question";
import { cn } from "@/lib/utils";

interface FilterRow {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export function ProblemFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [solvedCount, setSolvedCount] = useState(0);

  const allQuestions = useMemo(() => getAllQuestions(), []);
  const topics = useMemo(() => getSimpleTopics(allQuestions), [allQuestions]);

  useEffect(() => {
    setSolvedCount(allQuestions.filter((q) => isQuestionSolved(q.id)).length);
  }, [allQuestions]);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["status", "difficulty", "topic", "curriculum", "type"]) {
      params.delete(key);
    }
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const selectedDifficulties = searchParams.getAll("difficulty");
  const selectedStatus = searchParams.get("status") ?? "all";

  const toggleDifficulty = useCallback(
    (difficulty: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = new Set(params.getAll("difficulty"));
      if (current.has(difficulty)) {
        current.delete(difficulty);
      } else {
        current.add(difficulty);
      }
      params.delete("difficulty");
      [...current].forEach((d) => params.append("difficulty", d));
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleStatus = useCallback(
    (status: "solved" | "unsolved") => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get("status");
      if (current === status) {
        params.delete("status");
      } else {
        params.set("status", status);
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const rows: FilterRow[] = [
    {
      key: "topic",
      label: "Topics",
      options: [
        { value: "all", label: "All" },
        ...topics.map((t) => ({ value: t, label: t })),
      ],
    },
    {
      key: "curriculum",
      label: "Curriculum",
      options: [
        { value: "all", label: "All" },
        ...CURRICULA.map((c) => ({ value: c, label: c })),
      ],
    },
    {
      key: "type",
      label: "Type",
      options: [
        { value: "all", label: "All" },
        { value: "mcq", label: "MCQ" },
        { value: "long", label: "Long answer" },
      ],
    },
  ];

  const activeCount =
    (selectedDifficulties.length > 0 ? 1 : 0) +
    rows.filter((r) => {
    const v = searchParams.get(r.key);
    return v && v !== "all";
    }).length;

  return (
    <div className="flex items-center gap-3">
      {/* Search — left */}
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search questions"
          defaultValue={searchParams.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("q", (e.target as HTMLInputElement).value);
            }
          }}
          onBlur={(e) => updateFilter("q", e.target.value)}
          className="w-full rounded-full border border-border bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
        />
      </div>

      {/* Filter funnel button + dropdown panel */}
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
          aria-label="Filters"
          className={cn(
            "relative flex size-9 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground",
            panelOpen && "text-foreground bg-accent"
          )}
        >
          <Filter className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#C94A3D]" />
          )}
        </button>

        {panelOpen && (
          <div className="absolute left-0 top-11 z-20 w-[26rem] rounded-lg border border-border bg-popover p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filters</p>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close filters"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[5rem_1fr] items-start gap-2">
                <span className="text-sm text-muted-foreground pt-1.5">Status</span>
                <div className="flex flex-wrap gap-2">
                  {(["solved", "unsolved"] as const).map((s) => {
                    const checked = selectedStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStatus(s)}
                        className={cn(
                          "h-8 rounded-md border px-3 text-sm capitalize",
                          checked
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {checked ? "✓ " : ""}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-[5rem_1fr] items-start gap-2">
                <span className="text-sm text-muted-foreground pt-1.5">Difficulty</span>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => {
                    const checked = selectedDifficulties.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDifficulty(d)}
                        className={cn(
                          "h-8 rounded-md border px-3 text-sm",
                          checked
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {checked ? "✓ " : ""}
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              {rows.map((row) => (
                <div key={row.key} className="grid grid-cols-[5rem_1fr] items-center gap-2">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <select
                    value={searchParams.get(row.key) ?? "all"}
                    onChange={(e) => updateFilter(row.key, e.target.value)}
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
                  >
                    {row.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Solved counter — right */}
      <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
        <Circle className="size-4" />
        <span>
          {solvedCount}/{allQuestions.length} Solved
        </span>
      </div>
    </div>
  );
}
