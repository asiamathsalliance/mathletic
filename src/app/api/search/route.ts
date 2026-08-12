import { NextRequest } from "next/server";
import { searchQuestionSummaries } from "@/lib/questions";

/** Lightweight dropdown / typeahead search — never returns solutions or choices. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return Response.json({ results: [] });
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 8);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 12) : 8;

  const summaries = await searchQuestionSummaries(q, limit);
  const results = summaries.map((s) => ({
    id: s.id,
    curriculum: s.curriculum,
    topic: s.topic,
    difficulty: s.difficulty,
    questionText: s.preview,
  }));

  return Response.json(
    { results },
    {
      headers: {
        // Short private cache — summaries are static-ish; keeps repeat typing snappy.
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    }
  );
}
