"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { filterQuestionsForTable, type TableFilters } from "@/lib/questionTable";
import { competitionsFromParams } from "@/lib/competitions";
import {
  pageSlice,
  parsePage,
  parsePageSize,
  type PageSizeOption,
} from "@/lib/pagination";
import { useSolvedIds } from "@/lib/useProgress";
import type { Difficulty, Question } from "@/types/question";
import { ProblemTableHeader, ProblemTableRows } from "@/components/problems/ProblemTableRows";
import { TablePagination } from "@/components/problems/TablePagination";

function buildFilters(searchParams: URLSearchParams): TableFilters {
  return {
    competitions: competitionsFromParams(searchParams),
    topic: searchParams.get("topic") ?? "",
    difficulties: searchParams.getAll("difficulty") as Difficulty[],
    type: (searchParams.get("type") as TableFilters["type"]) ?? "all",
    statuses: searchParams
      .getAll("status")
      .filter((s): s is "solved" | "unsolved" => s === "solved" || s === "unsolved"),
    keyword: searchParams.get("q") ?? "",
  };
}

function filterKeyFromParams(searchParams: URLSearchParams): string {
  const p = new URLSearchParams(searchParams.toString());
  p.delete("page");
  p.delete("pageSize");
  return p.toString();
}

export function ProblemTable({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { solvedIds } = useSolvedIds();
  const tableRef = useRef<HTMLDivElement>(null);
  const prevFilterKey = useRef<string>("");
  const scrollAfterPaginateRef = useRef(false);

  const filters = useMemo(
    () => buildFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const filterKey = useMemo(
    () => filterKeyFromParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const rows = useMemo(
    () => filterQuestionsForTable(filters, questions, (id) => solvedIds.has(id)),
    [filters, questions, solvedIds]
  );

  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const page = parsePage(searchParams.get("page"), totalPages);

  const pageRows = useMemo(
    () => pageSlice(rows, page, pageSize),
    [rows, page, pageSize]
  );

  const startIndex = (page - 1) * pageSize;

  const updateUrl = useCallback(
    (updates: { page?: number; pageSize?: PageSizeOption }, scrollToTable = false) => {
      if (scrollToTable) scrollAfterPaginateRef.current = true;
      const params = new URLSearchParams(searchParams.toString());
      if (updates.pageSize !== undefined) {
        params.set("pageSize", String(updates.pageSize));
        params.set("page", "1");
      } else if (updates.page !== undefined) {
        params.set("page", String(updates.page));
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Reset to page 1 when filters/search change.
  useEffect(() => {
    if (prevFilterKey.current && prevFilterKey.current !== filterKey) {
      const current = parseInt(searchParams.get("page") ?? "1", 10);
      if (current !== 1) {
        updateUrl({ page: 1 });
      }
    }
    prevFilterKey.current = filterKey;
  }, [filterKey, searchParams, updateUrl]);

  // Clamp page when result count shrinks.
  useEffect(() => {
    const raw = parseInt(searchParams.get("page") ?? "1", 10);
    if (raw > totalPages) {
      updateUrl({ page: totalPages });
    }
  }, [totalPages, searchParams, updateUrl]);

  // Scroll to table only after the user changes page or page size via pagination controls.
  useEffect(() => {
    if (!scrollAfterPaginateRef.current) return;
    scrollAfterPaginateRef.current = false;
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, pageSize]);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        No questions match your filters.
      </p>
    );
  }

  return (
    <div ref={tableRef} className="scroll-mt-4">
      <div
        key={`${page}-${pageSize}`}
        className="rounded-lg border border-border bg-card overflow-hidden problem-table-page-in"
      >
        <ul>
          <ProblemTableHeader />
          <ProblemTableRows rows={pageRows} startIndex={startIndex} />
        </ul>
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={(p) => updateUrl({ page: p }, true)}
          onPageSizeChange={(size) => updateUrl({ pageSize: size }, true)}
        />
      </div>
    </div>
  );
}
