/** Valid public profile slug / username format. */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(normalizeUsername(value));
}
