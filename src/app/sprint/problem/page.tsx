import { SprintPlayClient } from "@/components/sprint/SprintPlayClient";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Problem Sprint | Mathletic",
};

export const dynamic = "force-dynamic";

export default async function ProblemSprintPage() {
  const configured = isSupabaseConfigured();
  let signedIn = false;
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  return (
    <SprintPlayClient
      modeType="PROBLEM_POOL"
      backHref="/sprint"
      signedIn={signedIn}
      configured={configured}
    />
  );
}
