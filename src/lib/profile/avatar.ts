/** First letter of a person's display name (dashboard, profile, settings). */
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
