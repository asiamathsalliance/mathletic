"use client";

import type { AchievementProgress } from "@/types/profile";
import { computeAchievements } from "@/lib/achievementStats";
import { cn } from "@/lib/utils";

export { computeAchievements };

export function AchievementGrid({ items }: { items: AchievementProgress[] }) {
  const unlocked = items.filter((i) => i.unlocked);
  const locked = items.filter((i) => !i.unlocked);

  return (
    <div className="space-y-8">
      {unlocked.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Unlocked ({unlocked.length})
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {unlocked.map((a) => (
              <AchievementBadge key={a.id} achievement={a} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          Locked ({locked.length})
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {locked.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AchievementBadge({ achievement: a }: { achievement: AchievementProgress }) {
  const pct =
    a.category === "leaderboard"
      ? a.unlocked
        ? 100
        : 0
      : Math.min(100, Math.round((a.progress / a.target) * 100));

  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-4 text-center transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-md",
        a.unlocked
          ? "border-primary/30 bg-accent/50"
          : "border-border bg-muted/30 opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
      )}
      title={a.description}
    >
      <span className="text-3xl">{a.icon}</span>
      <p className="mt-2 text-sm font-semibold text-foreground">{a.title}</p>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.description}</p>
      {!a.unlocked && a.category !== "leaderboard" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
