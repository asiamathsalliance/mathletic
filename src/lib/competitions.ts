import type { Competition } from "@/types/question";

/** Filter chips on the home problem list (maps to underlying DB competitions). */
export type CompetitionFilter = "AMC10" | "AMC12" | "OTHER";

export const COMPETITION_FILTER_OPTIONS: { id: CompetitionFilter; label: string }[] = [
  { id: "AMC10", label: "AMC 10" },
  { id: "AMC12", label: "AMC 12" },
  { id: "OTHER", label: "Other" },
];

export const OTHER_COMPETITIONS: Competition[] = ["HSC", "IB", "AP", "A_LEVEL"];

export const ALL_COMPETITIONS: Competition[] = ["AMC10", "AMC12", ...OTHER_COMPETITIONS];

export const COMPETITION_LABELS: Record<Competition, string> = {
  AMC10: "AMC 10",
  AMC12: "AMC 12",
  HSC: "HSC",
  IB: "IB",
  AP: "AP",
  A_LEVEL: "A-Level",
};

/** AMC topic cards on the Browse page. */
export const AMC_BROWSE_TOPICS = [
  "Algebra",
  "Geometry",
  "Number Theory",
  "Counting & Probability",
] as const;

/**
 * Default competition filters on the home list (empty = show all).
 * Set to ["AMC10", "AMC12"] once the AMC bank has content.
 */
export const DEFAULT_COMPETITION_FILTERS: CompetitionFilter[] = [];

const FILTER_IDS = new Set<string>(COMPETITION_FILTER_OPTIONS.map((o) => o.id));

/** Expand UI filter chips into DB competition values. */
export function expandCompetitionFilters(filters: CompetitionFilter[]): Competition[] {
  const out = new Set<Competition>();
  for (const f of filters) {
    if (f === "OTHER") OTHER_COMPETITIONS.forEach((c) => out.add(c));
    else out.add(f);
  }
  return [...out];
}

/** Read competition filter from URL search params. */
export function competitionsFromParams(params: URLSearchParams): Competition[] {
  const selected = params
    .getAll("competition")
    .filter((c): c is CompetitionFilter => FILTER_IDS.has(c));
  if (selected.length > 0) return expandCompetitionFilters(selected);
  if (params.get("competition") === "all") return [];
  return expandCompetitionFilters(DEFAULT_COMPETITION_FILTERS);
}
