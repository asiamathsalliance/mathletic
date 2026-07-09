"use client";

import { cn } from "@/lib/utils";
import { profileInitial } from "@/lib/profile/avatar";
import { countryByCode } from "@/lib/profile/constants";
import type { UserProfile } from "@/types/profile";

interface ProfilePreviewCardProps {
  profile: Partial<UserProfile>;
  email?: string | null;
}

export function ProfilePreviewCard({ profile, email }: ProfilePreviewCardProps) {
  const country = profile.countryCode ? countryByCode(profile.countryCode) : null;
  const display = profile.displayName || profile.username || "Your Name";
  const initial = profileInitial(profile, email);

  return (
    <div className="rounded-[24px] border border-border/60 bg-card p-6 shadow-[0_8px_24px_rgba(34,52,26,0.06)]">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Preview
      </p>
      <div className="flex items-start gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-2xl font-bold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-foreground">{display}</p>
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          {country && (
            <p className="mt-1 text-sm text-muted-foreground">
              {country.flag} {country.name}
            </p>
          )}
          {profile.school && (
            <p className="text-sm text-muted-foreground">{profile.school}</p>
          )}
          {profile.grade && (
            <p className="text-xs text-muted-foreground">{profile.grade}</p>
          )}
        </div>
      </div>
      {profile.bio && (
        <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
      )}
      {profile.topics && profile.topics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {profile.topics.map((t) => (
            <span
              key={t}
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileCard({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-border/60 bg-card p-6 sm:p-8",
        "shadow-[0_1px_3px_rgba(34,52,26,0.05),0_8px_24px_rgba(34,52,26,0.04)]",
        className
      )}
    >
      {title && <h2 className="text-section-header mb-6">{title}</h2>}
      {children}
    </div>
  );
}
