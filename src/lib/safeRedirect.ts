/**
 * Only allow same-origin relative paths for post-auth redirects.
 * Blocks open redirects like `//evil.com` or `https://evil.com`.
 */
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const path = raw.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  if (path.includes("\\")) return fallback;
  return path;
}
