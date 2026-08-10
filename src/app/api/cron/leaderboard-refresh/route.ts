import { NextRequest } from "next/server";
import { refreshLeaderboardCache } from "@/lib/leaderboardRefresh";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * POST /api/cron/leaderboard-refresh
 * Auth: Authorization: Bearer $CRON_SECRET (or x-cron-secret header).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not set" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const ok =
    headerSecret === secret ||
    (auth?.startsWith("Bearer ") && auth.slice(7) === secret);
  if (!ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshLeaderboardCache();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
