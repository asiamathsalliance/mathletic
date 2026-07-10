import { SprintEntry, type SprintBests } from "@/components/sprint/SprintEntry";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Sprint | Mathletic",
  description: "Choose your sprint mode — 1-minute multiplication or 5-minute problem sprint.",
};

export const dynamic = "force-dynamic";

async function loadBests(userId: string): Promise<SprintBests> {
  const supabase = await createClient();
  const modes = ["MULTIPLICATION", "PROBLEM_POOL"] as const;
  const result: SprintBests = { multiplication: null, problemPool: null };

  for (const modeType of modes) {
    const { data } = await supabase
      .from("sprint_sessions")
      .select("problems_solved")
      .eq("user_id", userId)
      .eq("mode_type", modeType)
      .eq("is_complete", true)
      .order("problems_solved", { ascending: false })
      .limit(1);
    const best = data?.[0]?.problems_solved ?? null;
    if (modeType === "MULTIPLICATION") result.multiplication = best;
    else result.problemPool = best;
  }
  return result;
}

export default async function SprintPage() {
  const configured = isSupabaseConfigured();
  let signedIn = false;
  let bests: SprintBests = { multiplication: null, problemPool: null };

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      try {
        bests = await loadBests(user.id);
      } catch {
        // Schema may not be migrated yet — entry still works without bests.
      }
    }
  }

  return <SprintEntry configured={configured} signedIn={signedIn} bests={bests} />;
}
