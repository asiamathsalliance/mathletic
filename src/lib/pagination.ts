export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
export const DEFAULT_PAGE_SIZE = 100;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePageSize(raw: string | null): PageSizeOption {
  const n = parseInt(raw ?? "", 10);
  if (PAGE_SIZE_OPTIONS.includes(n as PageSizeOption)) return n as PageSizeOption;
  return DEFAULT_PAGE_SIZE;
}

export function parsePage(raw: string | null, totalPages: number): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, totalPages));
}

/** Page numbers with ellipsis — always includes first, last, current, and neighbors. */
export function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) set.add(i);
  }

  const sorted = [...set].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(sorted[i]);
  }
  return result;
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function showingRange(
  page: number,
  pageSize: number,
  total: number
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
}
