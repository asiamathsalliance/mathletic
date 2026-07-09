import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { defaultProfile } from "@/lib/profile/constants";
import type { UserProfile } from "@/types/profile";

function profileFromMetadata(meta: Record<string, unknown>, email?: string): UserProfile {
  const base = defaultProfile(email);
  return {
    ...base,
    ...(meta.profile as Partial<UserProfile> | undefined),
    onboardingComplete: Boolean(meta.onboarding_complete ?? (meta.profile as UserProfile | undefined)?.onboardingComplete),
  };
}

/** GET /api/profile — current user's profile */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ signedIn: false, profile: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ signedIn: false, profile: null });

  const { data: row } = await supabase
    .from("users")
    .select("display_name, avatar_url, email, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileFromMetadata(user.user_metadata ?? {}, user.email);
  // display_name in public.users stores username (social); displayName lives in metadata only.

  return Response.json({
    signedIn: true,
    userId: user.id,
    email: user.email,
    memberSince: row?.created_at ?? user.created_at,
    profile,
  });
}

/** PATCH /api/profile — update profile */
export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: Partial<UserProfile> & { onboardingComplete?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = profileFromMetadata(user.user_metadata ?? {}, user.email);
  const merged: UserProfile = {
    ...current,
    ...body,
    notifications: { ...current.notifications, ...body.notifications },
    privacy: { ...current.privacy, ...body.privacy },
    appearance: { ...current.appearance, ...body.appearance },
  };

  if (body.onboardingComplete !== undefined) {
    merged.onboardingComplete = body.onboardingComplete;
  }

  await supabase.auth.updateUser({
    data: {
      profile: merged,
      onboarding_complete: merged.onboardingComplete,
      username: merged.username,
    },
  });

  // public.users.display_name = username for leaderboard / social appearance.
  await supabase
    .from("users")
    .update({
      display_name: merged.username,
      avatar_url: null,
    })
    .eq("id", user.id);

  return Response.json({ profile: merged });
}

/** POST /api/profile/check-username — body: { username } */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("action") !== "check-username") {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = body.username?.trim().toLowerCase();
  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    return Response.json({ available: false, reason: "Invalid format" });
  }

  // Reserved words
  const reserved = ["admin", "mathletic", "settings", "profile", "welcome"];
  if (reserved.includes(username)) {
    return Response.json({ available: false, reason: "Reserved" });
  }

  return Response.json({ available: true });
}
