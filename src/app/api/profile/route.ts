import { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { defaultProfile } from "@/lib/profile/constants";
import { googleAvatarUrl } from "@/lib/profile/avatar";
import type { UserProfile } from "@/types/profile";

function profileFromMetadata(meta: Record<string, unknown>, email?: string): UserProfile {
  const base = defaultProfile(email);
  const raw = { ...(meta.profile as Partial<UserProfile> | undefined) };
  // Avatar is always the Google photo — drop legacy customization fields.
  delete (raw as { avatarUrl?: string }).avatarUrl;
  delete (raw as { avatarType?: string }).avatarType;
  return {
    ...base,
    ...raw,
    onboardingComplete: Boolean(
      meta.onboarding_complete ?? (meta.profile as UserProfile | undefined)?.onboardingComplete
    ),
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
  const avatarUrl = googleAvatarUrl(user.user_metadata ?? {}, row?.avatar_url);

  // Keep public.users.avatar_url in sync with Google if it was wiped previously.
  if (avatarUrl && avatarUrl !== row?.avatar_url) {
    await supabase.from("users").update({ avatar_url: avatarUrl }).eq("id", user.id);
  }

  return Response.json({
    signedIn: true,
    userId: user.id,
    email: user.email,
    memberSince: row?.created_at ?? user.created_at,
    avatarUrl,
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

  // Ignore any client attempts to customize avatar.
  const { avatarUrl: _a, avatarType: _t, ...safeBody } = body as Partial<UserProfile> & {
    avatarUrl?: string;
    avatarType?: string;
    onboardingComplete?: boolean;
  };

  const current = profileFromMetadata(user.user_metadata ?? {}, user.email);
  const merged: UserProfile = {
    ...current,
    ...safeBody,
    notifications: { ...current.notifications, ...safeBody.notifications },
    privacy: { ...current.privacy, ...safeBody.privacy },
    appearance: { ...current.appearance, ...safeBody.appearance },
  };

  if (safeBody.onboardingComplete !== undefined) {
    merged.onboardingComplete = safeBody.onboardingComplete;
  }

  await supabase.auth.updateUser({
    data: {
      profile: merged,
      onboarding_complete: merged.onboardingComplete,
      username: merged.username,
    },
  });

  const avatarUrl = googleAvatarUrl(user.user_metadata ?? {}, null);

  // public.users.display_name = username for leaderboard / social appearance.
  await supabase
    .from("users")
    .update({
      display_name: merged.username,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  return Response.json({ profile: merged, avatarUrl });
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
