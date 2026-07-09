import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let destination = next;
      if (
        user &&
        !user.user_metadata?.onboarding_complete &&
        !next.startsWith("/welcome")
      ) {
        destination = `/welcome?next=${encodeURIComponent(next === "/" ? "/dashboard" : next)}`;
      }
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) {
        return NextResponse.redirect(`${origin}${destination}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`);
      }
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
