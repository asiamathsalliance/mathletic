import type { Question } from "@/types/question";
import { searchQuestionsAI } from "@/lib/questions";

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

export function filterQuestionsForDropdown(query: string, limit = 8): Question[] {
  const q = query.trim();
  if (!q) return [];
  return searchQuestionsAI(q).slice(0, limit);
}
