import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * One-time import of localStorage progress after first sign-in.
 * Body: { entries: [{ questionId: string, solvedAt: number }] }
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { entries?: { questionId?: string; solvedAt?: number }[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entries = (body.entries ?? [])
    .filter((e) => typeof e.questionId === "string" && e.questionId)
    .slice(0, 2000);
  if (entries.length === 0) return Response.json({ ok: true, imported: 0 });

  // Only import ids that exist in the questions table (FK would reject others).
  const ids = entries.map((e) => e.questionId as string);
  const { data: known } = await supabase.from("questions").select("id").in("id", ids);
  const knownIds = new Set((known ?? []).map((r) => r.id));

  const rows = entries
    .filter((e) => knownIds.has(e.questionId as string))
    .map((e) => ({
      user_id: user.id,
      question_id: e.questionId as string,
      status: "solved" as const,
      attempt_count: 1,
      solved_at: new Date(
        typeof e.solvedAt === "number" && e.solvedAt > 0 ? e.solvedAt : Date.now()
      ).toISOString(),
    }));

  if (rows.length === 0) return Response.json({ ok: true, imported: 0 });

  const { error } = await supabase
    .from("question_attempts")
    .upsert(rows, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, imported: rows.length });
}
