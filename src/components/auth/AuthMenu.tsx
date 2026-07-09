"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, BarChart3, Trophy, UserCircle, Settings } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { profileInitial } from "@/lib/profile/avatar";
import { importLocalProgressOnce } from "@/lib/progressSync";
import type { UserProfile } from "@/types/profile";
import { cn } from "@/lib/utils";

export function AuthMenu() {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configured) {
      setLoaded(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoaded(true);
      if (data.user) {
        void importLocalProgressOnce();
        if (
          !data.user.user_metadata?.onboarding_complete &&
          !window.location.pathname.startsWith("/welcome")
        ) {
          router.push(
            `/welcome?next=${encodeURIComponent(
              window.location.pathname === "/" ? "/dashboard" : window.location.pathname
            )}`
          );
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void importLocalProgressOnce();
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const signIn = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          window.location.pathname
        )}`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    window.location.reload();
  }, []);

  if (!configured || !loaded) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-muted px-3 text-sm font-semibold text-foreground hover:bg-accent"
      >
        <GoogleIcon />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  const meta = user.user_metadata ?? {};
  const profile = meta.profile as UserProfile | undefined;
  const displayName =
    profile?.displayName ||
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    user.email ||
    "You";
  const initial = profileInitial(
    { displayName: profile?.displayName, username: profile?.username },
    user.email
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-semibold text-foreground hover:bg-accent",
          open && "ring-2 ring-ring"
        )}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-56 rounded-lg border border-border bg-popover p-1.5 shadow-md">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            {user.email && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <UserCircle className="size-4 text-muted-foreground" />
            Profile
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <BarChart3 className="size-4 text-muted-foreground" />
            Progress
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Settings className="size-4 text-muted-foreground" />
            Settings
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Trophy className="size-4 text-muted-foreground" />
            Leaderboard
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            <LogOut className="size-4 text-muted-foreground" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
