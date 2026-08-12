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

/** Slim hit shape for the header search dropdown (no solutions/choices). */
export type SearchDropdownHit = {
  id: string;
  curriculum: string;
  topic: string;
  difficulty: string;
  questionText: string;
};

/** Fetch dropdown matches from the lightweight search API. */
export async function fetchQuestionsForDropdown(
  query: string,
  limit = 6,
  signal?: AbortSignal
): Promise<SearchDropdownHit[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(q)}&limit=${Math.min(limit, 12)}`,
    { signal, cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: SearchDropdownHit[] };
  return (data.results ?? []).slice(0, limit);
}
