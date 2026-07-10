import { SprintPlayClient } from "@/components/sprint/SprintPlayClient";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Multiplication Sprint | Mathletic",
};

export const dynamic = "force-dynamic";

export default async function MultiplicationSprintPage() {
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
      modeType="MULTIPLICATION"
      backHref="/sprint"
      signedIn={signedIn}
      configured={configured}
    />
  );
}
