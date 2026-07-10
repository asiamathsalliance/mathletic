"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Zap, Brain, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SPRINT_MODE_TYPES, type SprintModeType } from "@/lib/sprint";
import { cn } from "@/lib/utils";

export interface SprintBests {
  multiplication: number | null;
  problemPool: number | null;
}

export function SprintEntry({
  configured,
  signedIn,
  bests,
}: {
  configured: boolean;
  signedIn: boolean;
  bests: SprintBests;
}) {
  const router = useRouter();
  const [pressing, setPressing] = useState<SprintModeType | null>(null);

  const signIn = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/sprint")}`,
      },
    });
  }, []);

  const handleCardClick = (modeType: SprintModeType, href: string) => {
    if (!signedIn) return;
    setPressing(modeType);
    setTimeout(() => {
      router.push(href);
    }, 180);
  };

  const bestFor = (modeType: SprintModeType) =>
    modeType === "MULTIPLICATION" ? bests.multiplication : bests.problemPool;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 py-12">
      <h1 className="text-page-title mb-2 text-center">Choose your sprint</h1>
      <p className="text-muted-foreground mb-12 text-center text-sm">
        Two sprint modes — 1 minute for times tables, 5 minutes for problems.
      </p>

      {!configured ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Sprint needs the Supabase backend. Add your Supabase keys to{" "}
          <code>.env.local</code> and restart the dev server.
        </div>
      ) : !signedIn ? (
        <div className="rounded-lg border border-border bg-card space-y-4 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to play Sprint and track your personal bests.
          </p>
          <Button onClick={signIn}>Sign in with Google</Button>
        </div>
      ) : (
        <div className="grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-2">
          {SPRINT_MODE_TYPES.map((mode, i) => {
            const best = bestFor(mode.id);
            const Icon = mode.icon === "multiply" ? Zap : Brain;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleCardClick(mode.id, mode.href)}
                className={cn(
                  "sprint-card-float group relative rounded-2xl border border-border bg-card p-8 text-left shadow-md transition-all duration-200",
                  "hover:-translate-y-1 hover:shadow-xl hover:brightness-[1.02]",
                  pressing === mode.id && "sprint-card-press scale-[0.97]",
                  i === 1 && "sprint-card-float-delay"
                )}
              >
                <div
                  className={cn(
                    "mb-4 flex size-14 items-center justify-center rounded-xl",
                    mode.id === "MULTIPLICATION"
                      ? "bg-[#E8F0C4] text-[#8FA82F]"
                      : "bg-[#E3EEF8] text-[#2E6DA4]"
                  )}
                >
                  <Icon className="size-7" />
                </div>
                <h2 className="text-lg font-semibold">{mode.label}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{mode.blurb}</p>
                {best !== null && best > 0 && (
                  <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#1C4B3B]">
                    <Trophy className="size-4 text-[#C9941F]" />
                    Personal best: {best} solved
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {signedIn && (
        <Link
          href="/leaderboard?board=sprint&mode=MULTIPLICATION"
          className="text-muted-foreground hover:text-foreground mt-10 text-sm underline-offset-4 hover:underline"
        >
          View sprint leaderboards
        </Link>
      )}
    </div>
  );
}
