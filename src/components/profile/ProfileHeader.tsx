"use client";

import Link from "next/link";
import { profileInitial } from "@/lib/profile/avatar";
import { countryByCode } from "@/lib/profile/constants";
import type { ProfileStats, UserProfile } from "@/types/profile";

interface ProfileHeaderProps {
  profile: UserProfile;
  email?: string | null;
  memberSince?: string | null;
  stats: ProfileStats;
}

export function ProfileHeader({ profile, email, memberSince, stats }: ProfileHeaderProps) {
  const country = profile.countryCode ? countryByCode(profile.countryCode) : null;
  const display = profile.displayName || "Your Name";
  const initial = profileInitial(profile, email);
  const since = memberSince
    ? new Date(memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="rounded-[24px] border border-border/60 bg-card p-6 sm:p-8 shadow-[0_8px_28px_rgba(34,52,26,0.05)]">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-muted text-3xl font-bold sm:size-24">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{display}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            {country && profile.privacy.showCountry && (
              <p className="mt-2 text-sm text-muted-foreground">
                {country.flag} {country.name}
              </p>
            )}
            {profile.school && profile.privacy.showSchool && (
              <p className="text-sm text-muted-foreground">{profile.school}</p>
            )}
            {profile.grade && (
              <p className="text-sm text-muted-foreground">{profile.grade}</p>
            )}
            {since && (
              <p className="mt-2 text-xs text-muted-foreground">Member since {since}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
          <QuickStat label="Problems Solved" value={stats.solved} />
          <QuickStat label="Current Streak" value={stats.currentStreak} suffix=" days" />
          <QuickStat label="Longest Streak" value={stats.longestStreak} suffix=" days" />
          <QuickStat
            label="Rank"
            value={stats.rank ?? "—"}
            prefix={stats.rank ? "#" : undefined}
          />
          <QuickStat label="Achievements" value={stats.achievementsEarned} />
          <QuickStat label="XP" value={stats.solved * 10 + stats.bestSprint} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-6">
        <Link href="/settings?from=profile" className="btn-secondary text-sm">
          Edit Profile
        </Link>
        <Link href="/leaderboard" className="btn-secondary text-sm">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
        {prefix}
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix}
      </p>
    </div>
  );
}

export function useProfileStatsFromAttempts(
  solvedCount: number,
  activityDays: { date: string; count: number }[]
): ProfileStats {
  const active = activityDays.filter((d) => d.count > 0);
  const sorted = active.map((d) => d.date).sort();

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    if (prev) {
      const diff =
        (new Date(date).getTime() - new Date(prev).getTime()) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = date;
  }

  const activeSet = new Set(sorted);
  let current = 0;
  const cursor = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!activeSet.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeSet.has(fmt(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    solved: solvedCount,
    currentStreak: current,
    longestStreak: longest,
    rank: null,
    totalUsers: 0,
    achievementsEarned: 0,
    bestSprint: 0,
  };
}
