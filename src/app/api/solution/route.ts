import { NextRequest } from "next/server";
import { createClient, createAnonClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getQuestionSecret } from "@/lib/questionSecrets";

/**
 * GET /api/solution?questionId=
 * Returns solution only if the signed-in user has already solved the question.
 */
export async function GET(request: NextRequest) {
  const questionId = request.nextUrl.searchParams.get("questionId")?.trim();
  if (!questionId) {
    return Response.json({ error: "Missing questionId" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data: attempt } = await supabase
    .from("question_attempts")
    .select("status")
    .eq("user_id", user.id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (!attempt || attempt.status !== "solved") {
    return Response.json({ error: "Solve the question first" }, { status: 403 });
  }

  const anon = createAnonClient();
  const { data: row } = await anon
    .from("questions")
    .select("solution, solution_image_url, verified")
    .eq("id", questionId)
    .eq("verified", true)
    .maybeSingle();

  if (row) {
    return Response.json({
      solution: row.solution ?? "",
      solutionImage: row.solution_image_url ?? null,
    });
  }

  const secret = getQuestionSecret(questionId);
  if (!secret) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }

  return Response.json({
    solution: secret.solution,
    solutionImage: secret.solutionImage ?? null,
  });
}
