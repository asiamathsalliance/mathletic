import {
  getQuestionSummaries,
  interleaveSummaries,
  type QuestionSummary,
} from "@/lib/questions";
import {
  filterSummariesForTable,
  getSimpleTopics,
  type TableFilters,
} from "@/lib/questionTable";
import { competitionsFromParams } from "@/lib/competitions";
import { parsePage, parsePageSize, pageSlice } from "@/lib/pagination";
import type { Difficulty } from "@/types/question";

function filtersFromSearchParams(params: URLSearchParams): TableFilters {
  return {
    competitions: competitionsFromParams(params),
    topic: params.get("topic") ?? "",
    difficulties: params.getAll("difficulty") as Difficulty[],
    type: (params.get("type") as TableFilters["type"]) ?? "all",
    statuses: [],
    keyword: params.get("q") ?? "",
  };
}

function applyStatus(
  items: QuestionSummary[],
  params: URLSearchParams,
  solvedIds: Set<string>
): QuestionSummary[] {
  const statuses = params
    .getAll("status")
    .filter((s): s is "solved" | "unsolved" => s === "solved" || s === "unsolved");
  if (statuses.length !== 1) return items;
  if (statuses[0] === "solved") return items.filter((q) => solvedIds.has(q.id));
  return items.filter((q) => !solvedIds.has(q.id));
}

export interface PracticeListResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: QuestionSummary[];
  ids: string[];
  topics: string[];
  bankTotal: number;
}

/** Build ordered + filtered summaries for the practice list (one page). */
export async function buildPracticeList(
  params: URLSearchParams,
  solvedIds: Set<string> = new Set()
): Promise<PracticeListResult> {
  const summaries = await getQuestionSummaries();
  const filters = filtersFromSearchParams(params);
  const rows = filterSummariesForTable(filters, summaries, () => false);
  const byId = new Map(summaries.map((s) => [s.id, s]));
  let items = rows.map((r) => byId.get(r.question.id)!).filter(Boolean);

  const hasNarrowFilter =
    Boolean(filters.topic) ||
    (filters.difficulties && filters.difficulties.length > 0) ||
    (filters.type && filters.type !== "all") ||
    Boolean(filters.keyword?.trim());

  if (!hasNarrowFilter) {
    items = interleaveSummaries(items);
  }

  items = applyStatus(items, params, solvedIds);

  const pageSize = parsePageSize(params.get("pageSize"));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const page = parsePage(params.get("page"), totalPages);
  const pageItems = pageSlice(items, page, pageSize);

  return {
    page,
    pageSize,
    total,
    totalPages,
    items: pageItems,
    ids: items.map((i) => i.id),
    topics: getSimpleTopics(summaries),
    bankTotal: summaries.length,
  };
}
