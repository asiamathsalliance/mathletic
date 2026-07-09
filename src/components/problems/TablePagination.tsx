"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getPageNumbers,
  PAGE_SIZE_OPTIONS,
  showingRange,
  type PageSizeOption,
} from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  page: number;
  pageSize: PageSizeOption;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const { from, to } = showingRange(page, pageSize, totalItems);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-border bg-muted/20 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground tabular-nums">
          {totalItems === 0 ? (
            "No questions to display"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-foreground">
                {from.toLocaleString()}–{to.toLocaleString()}
              </span>{" "}
              of {totalItems.toLocaleString()} questions
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10) as PageSizeOption)}
              className="h-9 rounded-xl border border-border bg-card px-2.5 text-sm font-medium text-foreground shadow-sm outline-none transition-shadow hover:shadow-md focus:border-ring"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden sm:inline tabular-nums">
            Page {page} of {totalPages}
          </span>
        </div>
      </div>

      <nav
        className="flex flex-wrap items-center justify-center gap-2 sm:justify-between"
        aria-label="Pagination"
      >
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm",
            "transition-all duration-200 hover:-translate-y-px hover:shadow-md",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="text-sm font-medium tabular-nums text-foreground sm:hidden">
          Page {page} of {totalPages}
        </span>

        <div className="hidden items-center gap-1.5 sm:flex">
          {pageNumbers.map((item, i) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${i}`}
                className="px-1.5 text-sm text-muted-foreground select-none"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-medium tabular-nums",
                  "transition-all duration-200",
                  item === page
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-card text-foreground shadow-sm hover:-translate-y-px hover:shadow-md"
                )}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm",
            "transition-all duration-200 hover:-translate-y-px hover:shadow-md",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </nav>
    </div>
  );
}
