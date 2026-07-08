"use client";

import { BADGE_LABELS, type BadgeId } from "@/lib/gameProfile";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BadgeGridProps {
  badges: BadgeId[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const allBadges = Object.keys(BADGE_LABELS) as BadgeId[];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {allBadges.map((id) => {
        const earned = badges.includes(id);
        return (
          <Card
            key={id}
            className={cn(
              "text-center py-3",
              earned ? "border-primary/40 bg-primary/5" : "opacity-50"
            )}
          >
            <CardContent className="p-0">
              <p className="text-sm font-medium">{BADGE_LABELS[id]}</p>
              <p className="text-meta mt-1 normal-case tracking-normal">
                {earned ? "Earned" : "Locked"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
