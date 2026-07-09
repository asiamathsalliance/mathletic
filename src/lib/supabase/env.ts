/** True when the Supabase env vars are configured. Until then the app
 * falls back to the bundled JSON question bank and localStorage progress. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
