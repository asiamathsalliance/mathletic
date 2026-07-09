import { notFound } from "next/navigation";
import { PublicProfileClient } from "./PublicProfileClient";
import { getPublicProfile } from "@/lib/publicProfile";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `${username} | Mathletic`,
    description: `View ${username}'s public progress on Mathletic.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const result = await getPublicProfile(username);

  if (result === "not_found") notFound();

  if (result === "private") {
    return (
      <div className="mx-auto max-w-[1400px] py-20 text-center">
        <h1 className="text-page-title">Profile is private</h1>
        <p className="mt-2 text-muted-foreground">
          This user has chosen to keep their profile hidden.
        </p>
      </div>
    );
  }

  let isViewer = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isViewer = user?.id === result.userId;
  }

  return <PublicProfileClient profile={result} isViewer={isViewer} />;
}
