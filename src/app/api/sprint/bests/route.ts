import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { SprintModeType } from "@/lib/sprint";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ multiplication: null, problemPool: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ multiplication: null, problemPool: null });
  }

  const userId = user.id;

  async function bestForMode(modeType: SprintModeType): Promise<number | null> {
    const { data } = await supabase
      .from("sprint_sessions")
      .select("problems_solved")
      .eq("user_id", userId)
      .eq("mode_type", modeType)
      .eq("is_complete", true)
      .order("problems_solved", { ascending: false })
      .limit(1);
    return data?.[0]?.problems_solved ?? null;
  }

  const [multiplication, problemPool] = await Promise.all([
    bestForMode("MULTIPLICATION"),
    bestForMode("PROBLEM_POOL"),
  ]);

  return Response.json({ multiplication, problemPool });
}
