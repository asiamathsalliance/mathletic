/** Resolve Google OAuth avatar URL from auth metadata or stored row. */
export function googleAvatarUrl(
  meta?: Record<string, unknown> | null,
  stored?: string | null
): string | null {
  if (stored?.trim()) return stored.trim();
  if (!meta) return null;
  const fromMeta =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    "";
  return fromMeta.trim() || null;
}

/** First letter fallback when a Google photo is unavailable. */
export function profileInitial(
  profile: { displayName?: string; username?: string },
  email?: string | null
): string {
  const source = profile.displayName?.trim() || profile.username?.trim() || email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

/** First letter of username for social surfaces (leaderboard). */
export function socialInitial(username: string | null | undefined): string {
  const source = username?.trim() || "?";
  return source.charAt(0).toUpperCase();
}
