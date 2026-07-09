import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./env";

/** Server-only Supabase client with service role (reads auth metadata). */
export function createAdminClient() {
  if (!isSupabaseConfigured()) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
