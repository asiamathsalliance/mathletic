"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, Copy, GitCompare, Trophy } from "lucide-react";
import { countryByCode } from "@/lib/profile/constants";
import { socialInitial } from "@/lib/profile/avatar";
import type { PublicProfilePayload } from "@/lib/publicProfile";
import { cn } from "@/lib/utils";

interface PublicProfileHeaderProps {
  profile: PublicProfilePayload;
  isViewer: boolean;
}

export function PublicProfileHeader({ profile, isViewer }: PublicProfileHeaderProps) {
  const [copied, setCopied] = useState(false);
  const initial = socialInitial(profile.username);
  const country = profile.countryCode ? countryByCode(profile.countryCode) : null;
  const since = new Date(profile.memberSince).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/u/${profile.username}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profile.username]);

  return (
    <div
      className={cn(
        "public-profile-rise rounded-[24px] border border-border/60 bg-card p-6 sm:p-8",
        "shadow-[0_8px_28px_rgba(34,52,26,0.05)]"
      )}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {isViewer ? "Your public profile" : "Public profile"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="btn-secondary gap-1.5 text-xs"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Profile Link"}
          </button>
          {profile.showLeaderboardRank && (
            <Link href="/leaderboard" className="btn-secondary gap-1.5 text-xs">
              <Trophy className="size-3.5" />
              View on Leaderboard
            </Link>
          )}
          <button
            type="button"
            disabled
            title="Coming soon"
            className="btn-secondary cursor-not-allowed gap-1.5 text-xs opacity-50"
          >
            <GitCompare className="size-3.5" />
            Compare Progress
          </button>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-muted text-3xl font-bold sm:size-24">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{profile.username}</h1>
          {profile.displayName && (
            <p className="mt-0.5 text-muted-foreground">{profile.displayName}</p>
          )}
          {country && profile.country && (
            <p className="mt-2 text-sm text-muted-foreground">
              {country.flag} {profile.country}
            </p>
          )}
          {profile.school && (
            <p className="text-sm text-muted-foreground">{profile.school}</p>
          )}
          {profile.grade && <p className="text-sm text-muted-foreground">{profile.grade}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Member since {since}</p>
        </div>
      </div>
    </div>
  );
}
