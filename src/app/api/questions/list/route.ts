import { NextRequest } from "next/server";
import { buildPracticeList } from "@/lib/practiceList";

export const revalidate = 60;

/** GET /api/questions/list — paginated lightweight practice rows. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const solvedParam = params.get("solved");
  const solvedIds = new Set(
    solvedParam ? solvedParam.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  const data = await buildPracticeList(params, solvedIds);
  const includeIds = params.get("includeIds") !== "0";
  return Response.json({
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages,
    items: data.items,
    topics: data.topics,
    bankTotal: data.bankTotal,
    ...(includeIds ? { ids: data.ids } : {}),
  });
}
