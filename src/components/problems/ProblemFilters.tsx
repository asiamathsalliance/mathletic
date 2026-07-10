"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Filter, Search, X } from "lucide-react";
import {
  filterQuestionsForTable,
  getSimpleTopics,
  type TableFilters,
} from "@/lib/questionTable";
import { useSolvedIds } from "@/lib/useProgress";
import {
  COMPETITION_FILTER_OPTIONS,
  competitionsFromParams,
  DEFAULT_COMPETITION_FILTERS,
  type CompetitionFilter,
} from "@/lib/competitions";
import { DIFFICULTIES, type Difficulty, type Question } from "@/types/question";
import { cn } from "@/lib/utils";

interface FilterRow {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export { competitionsFromParams };

const FILTER_PANEL_KEY = "mathletic-filters-panel-open";

export function ProblemFilters({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [panelOpen, setPanelOpenState] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const setPanelOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setPanelOpenState((prev) => {
      const next = typeof open === "function" ? open(prev) : open;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(FILTER_PANEL_KEY, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(FILTER_PANEL_KEY) === "1") {
      setPanelOpenState(true);
    }
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [panelOpen, setPanelOpen]);
  const { solvedIds } = useSolvedIds();

  const topics = useMemo(() => getSimpleTopics(questions), [questions]);

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
    for (const key of ["status", "difficulty", "topic", "competition", "type"]) {
      params.delete(key);
    }
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const selectedDifficulties = searchParams.getAll("difficulty");
  const selectedStatuses = searchParams
    .getAll("status")
    .filter((s): s is "solved" | "unsolved" => s === "solved" || s === "unsolved");
  const urlParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams]
  );
  const selectedCompetitionFilters = useMemo(() => {
    const fromUrl = searchParams
      .getAll("competition")
      .filter((c): c is CompetitionFilter =>
        COMPETITION_FILTER_OPTIONS.some((o) => o.id === c)
      );
    if (fromUrl.length > 0) return fromUrl;
    if (searchParams.get("competition") === "all") return [];
    return DEFAULT_COMPETITION_FILTERS;
  }, [searchParams]);
  const explicitCompetitionFilters = searchParams
    .getAll("competition")
    .filter((c) => c !== "all" && COMPETITION_FILTER_OPTIONS.some((o) => o.id === c));

  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = new Set(params.getAll(key).filter((v) => v !== "all"));
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      params.delete(key);
      [...current].forEach((v) => params.append(key, v));
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleCompetitionFilter = useCallback(
    (filter: CompetitionFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = new Set(
        params
          .getAll("competition")
          .filter((c): c is CompetitionFilter =>
            COMPETITION_FILTER_OPTIONS.some((o) => o.id === c)
          )
      );
      if (current.size === 0 && DEFAULT_COMPETITION_FILTERS.length > 0) {
        DEFAULT_COMPETITION_FILTERS.forEach((c) => current.add(c));
      }
      if (current.has(filter)) {
        current.delete(filter);
      } else {
        current.add(filter);
      }
      params.delete("competition");
      if (current.size === 0) {
        if (DEFAULT_COMPETITION_FILTERS.length > 0) params.set("competition", "all");
      } else {
        [...current].forEach((c) => params.append("competition", c));
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const showAllSubjects = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("competition");
    if (DEFAULT_COMPETITION_FILTERS.length > 0) params.set("competition", "all");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const toggleStatus = useCallback(
    (status: "solved" | "unsolved") => toggleMulti("status", status),
    [toggleMulti]
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
    (explicitCompetitionFilters.length > 0 ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0) +
    rows.filter((r) => {
      const v = searchParams.get(r.key);
      return v && v !== "all";
    }).length;

  const hasAnyFilter =
    activeCount > 0 ||
    Boolean(searchParams.get("q")) ||
    selectedCompetitionFilters.length > 0;

  const filters: TableFilters = {
    competitions: competitionsFromParams(urlParams),
    topic: searchParams.get("topic") ?? "",
    difficulties: selectedDifficulties as Difficulty[],
    type: (searchParams.get("type") as TableFilters["type"]) ?? "all",
    statuses: selectedStatuses,
    keyword: searchParams.get("q") ?? "",
  };
  const filteredRows = filterQuestionsForTable(
    { ...filters, statuses: [] },
    questions,
    (id) => solvedIds.has(id)
  );
  const filteredSolved = filteredRows.filter((r) => r.solved).length;

  return (
    <div className="flex items-center gap-3">
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
          className="w-full rounded-full border border-border bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:bg-[color-mix(in_srgb,var(--card)_72%,var(--muted))]"
        />
      </div>

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
                <span className="text-sm text-muted-foreground pt-1.5">Subject</span>
                <div className="flex flex-wrap gap-2">
                  {COMPETITION_FILTER_OPTIONS.map(({ id, label }) => {
                    const checked = selectedCompetitionFilters.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleCompetitionFilter(id)}
                        className={cn(
                          "h-8 rounded-md border px-3 text-sm",
                          checked
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {checked ? "✓ " : ""}
                        {label}
                      </button>
                    );
                  })}
                  {selectedCompetitionFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={showAllSubjects}
                      className="h-8 rounded-md px-2 text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Show all
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[5rem_1fr] items-start gap-2">
                <span className="text-sm text-muted-foreground pt-1.5">Status</span>
                <div className="flex flex-wrap gap-2">
                  {(["solved", "unsolved"] as const).map((s) => {
                    const checked = selectedStatuses.includes(s);
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
                        onClick={() => toggleMulti("difficulty", d)}
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

      <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
        <Circle className="size-4" />
        <span>
          {hasAnyFilter
            ? `${filteredSolved}/${filteredRows.length} solved (filtered)`
            : `${filteredSolved}/${questions.length} solved`}
        </span>
      </div>
    </div>
  );
}
