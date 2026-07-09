"use client";

import type { AchievementProgress } from "@/types/profile";
import { cn } from "@/lib/utils";

export function PublicAchievements({
  items,
  total,
  limited = false,
}: {
  items: AchievementProgress[];
  total?: number;
  limited?: boolean;
}) {
  const countLabel = total ?? items.length;

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-border/60 bg-card p-6 sm:p-8 shadow-[0_8px_28px_rgba(34,52,26,0.05)]">
        <h2 className="text-section-header mb-4">Achievements</h2>
        <p className="text-sm text-muted-foreground">No badges earned yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-border/60 bg-card p-6 sm:p-8 shadow-[0_8px_28px_rgba(34,52,26,0.05)]">
      <h2 className="text-section-header mb-2">
        Achievements{" "}
        <span className="font-normal text-muted-foreground">({countLabel})</span>
      </h2>
      {limited ? (
        <p className="mb-6 text-xs text-muted-foreground">Showing 3 most recent</p>
      ) : (
        <div className="mb-6" />
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((a) => (
          <PublicAchievementBadge key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}

function PublicAchievementBadge({ achievement: a }: { achievement: AchievementProgress }) {
  const unlockedLabel = a.unlockedAt
    ? new Date(a.unlockedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-primary/30 bg-accent/50 p-4 text-center",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
      )}
    >
      <span className="text-3xl">{a.icon}</span>
      <p className="mt-2 text-sm font-semibold text-foreground">{a.title}</p>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-2 bottom-full z-10 mb-2 rounded-xl border border-border bg-card p-3 text-left shadow-md",
          "translate-y-1 opacity-0 transition-all duration-200",
          "group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100"
        )}
        role="tooltip"
      >
        <p className="text-sm font-semibold text-foreground">{a.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
        {unlockedLabel && (
          <p className="mt-2 text-xs text-muted-foreground">Unlocked {unlockedLabel}</p>
        )}
      </div>
    </div>
  );
}
