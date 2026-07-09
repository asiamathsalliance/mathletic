import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** GET: the current user's attempts (solved/attempted per question). */
export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ signedIn: false, attempts: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ signedIn: false, attempts: [] });

  const { data, error } = await supabase
    .from("question_attempts")
    .select("question_id, status, solved_at, attempt_count")
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ signedIn: true, attempts: data ?? [] });
}

/** POST: record an attempt. Body: { questionId: string, correct: boolean } */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { questionId?: string; correct?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const correct = Boolean(body.correct);
  if (!questionId) return Response.json({ error: "Missing questionId" }, { status: 400 });

  const { data: existing } = await supabase
    .from("question_attempts")
    .select("id, status, attempt_count")
    .eq("user_id", user.id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    const becomeSolved = correct && existing.status !== "solved";
    const { error } = await supabase
      .from("question_attempts")
      .update({
        attempt_count: existing.attempt_count + 1,
        ...(becomeSolved ? { status: "solved", solved_at: new Date().toISOString() } : {}),
      })
      .eq("id", existing.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("question_attempts").insert({
      user_id: user.id,
      question_id: questionId,
      status: correct ? "solved" : "attempted",
      attempt_count: 1,
      solved_at: correct ? new Date().toISOString() : null,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
