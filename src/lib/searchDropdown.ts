import type { Question } from "@/types/question";

/** Truncate question text for dropdown while keeping LaTeX fragments intact when possible. */
export function questionPreviewForDropdown(text: string, maxLen = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;

  let cut = trimmed.slice(0, maxLen);
  const openDollar = (cut.match(/\$/g) ?? []).length % 2 === 1;
  if (openDollar) {
    const lastDollar = cut.lastIndexOf("$");
    if (lastDollar > 0) cut = cut.slice(0, lastDollar);
  }
  return `${cut.trim()}…`;
}

/** Fetch dropdown matches from the search API (questions now live in the DB). */
export async function fetchQuestionsForDropdown(
  query: string,
  limit = 8,
  signal?: AbortSignal
): Promise<Question[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Question[] };
  return (data.results ?? []).slice(0, limit);
}
