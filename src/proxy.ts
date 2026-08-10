import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths where we must re-validate the JWT with Supabase (mutations). */
function needsAuthRevalidate(request: NextRequest): boolean {
  if (request.method === "GET" || request.method === "HEAD") return false;
  const path = request.nextUrl.pathname;
  return (
    path.startsWith("/api/attempts") ||
    path.startsWith("/api/sprint") ||
    path.startsWith("/api/grade") ||
    path.startsWith("/api/solution") ||
    path.startsWith("/api/profile") ||
    path.startsWith("/api/user") ||
    path.startsWith("/api/analyze-solution")
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  // Normal page navigations: skip network auth round-trip. Session cookies
  // are still forwarded; Server Components / mutation APIs re-validate when needed.
  if (!needsAuthRevalidate(request)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    await supabase.auth.getUser();
  } catch (err) {
    const cause = err instanceof Error && "cause" in err ? (err as { cause?: unknown }).cause : null;
    const code =
      cause && typeof cause === "object" && "code" in cause
        ? String((cause as { code?: unknown }).code)
        : "";
    if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
      console.warn("Supabase auth refresh skipped (network):", code);
    } else {
      console.warn("Supabase auth refresh skipped:", err instanceof Error ? err.message : err);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
