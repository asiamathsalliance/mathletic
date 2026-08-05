"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { QuestionSummary } from "@/lib/questionSummary";
import { parsePage, parsePageSize, type PageSizeOption } from "@/lib/pagination";
import { useSolvedIds } from "@/lib/useProgress";
import { ProblemTableHeader, ProblemTableRows } from "@/components/problems/ProblemTableRows";
import { TablePagination } from "@/components/problems/TablePagination";
import type { QuestionTableRow } from "@/lib/questionTable";

interface ListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: QuestionSummary[];
}

function toRows(
  items: QuestionSummary[],
  solvedIds: Set<string>,
  progressLoaded: boolean
): QuestionTableRow[] {
  return items.map((q) => ({
    question: {
      id: q.id,
      curriculum: q.curriculum,
      competition: q.competition,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.preview,
    },
    // Avoid hydration mismatch: only show solved after client progress loads.
    solved: progressLoaded && solvedIds.has(q.id),
    type: q.isMcq ? "MCQ" : "Long",
  }));
}

export function ProblemTable({
  initialItems,
  initialTotal,
  initialPage,
  initialPageSize,
}: {
  initialItems: QuestionSummary[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { solvedIds, loaded: progressLoaded } = useSolvedIds();
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollAfterPaginateRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const pageSize = parsePageSize(searchParams.get("pageSize") ?? String(initialPageSize));
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = parsePage(searchParams.get("page") ?? String(initialPage), totalPages);

  const queryKey = searchParams.toString();
  const didMount = useRef(false);
  const statusFilterActive =
    searchParams.getAll("status").includes("solved") ||
    searchParams.getAll("status").includes("unsolved");

  // Fetch only the requested page when URL filters/page change (not the full bank).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams(queryKey);
    if (!params.has("pageSize")) params.set("pageSize", String(pageSize));

    if (statusFilterActive) {
      if (!progressLoaded) return;
      params.set("solved", [...solvedIds].join(","));
    }

    setLoading(true);
    fetch(`/api/questions/list?${params.toString()}&includeIds=0`)
      .then((r) => r.json())
      .then((data: ListResponse) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        /* keep previous page */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey, progressLoaded, pageSize, statusFilterActive, solvedIds]);

  // Keep in sync if the server re-renders with new initial props (e.g. soft navigation).
  useEffect(() => {
    setItems(initialItems);
    setTotal(initialTotal);
  }, [initialItems, initialTotal]);

  const rows = useMemo(
    () => toRows(items, solvedIds, progressLoaded),
    [items, solvedIds, progressLoaded]
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
      startTransition(() => {
        router.replace(`/?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (!scrollAfterPaginateRef.current) return;
    scrollAfterPaginateRef.current = false;
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, pageSize]);

  if (total === 0 && !loading) {
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
        className={`rounded-lg border border-border bg-card overflow-hidden problem-table-page-in ${
          loading || isPending ? "opacity-70" : ""
        }`}
      >
        <ul>
          <ProblemTableHeader />
          <ProblemTableRows rows={rows} startIndex={startIndex} />
        </ul>
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={(p) => updateUrl({ page: p }, true)}
          onPageSizeChange={(size) => updateUrl({ pageSize: size }, true)}
        />
      </div>
    </div>
  );
}
