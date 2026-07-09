import { SprintClient } from "@/components/sprint/SprintClient";
import { getSprintTopics } from "@/lib/sprintServer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Sprint | Mathletic",
  description: "5-minute timed math sprint — answer as many problems as you can.",
};

export const dynamic = "force-dynamic";

export default async function SprintPage() {
  const topics = await getSprintTopics();

  let signedIn = false;
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  return <SprintClient topics={topics} configured={configured} signedIn={signedIn} />;
}
