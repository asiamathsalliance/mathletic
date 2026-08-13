import Link from "next/link";
import {
  BOARDS,
  WINDOWS,
  SPRINT_MODES,
  makeLeaderboardHref,
  type LeaderboardParams,
} from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

export function LeaderboardTabs({ params }: { params: LeaderboardParams }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
        {BOARDS.map((b) => (
          <Link
            key={b.id}
            href={makeLeaderboardHref(params, {
              board: b.id,
              ...(b.id === "sprint" ? { mode: params.mode } : {}),
            })}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              b.id === params.board
                ? "bg-[#1C4B3B] text-white"
                : "text-[#1C4B3B] hover:bg-background"
            )}
          >
            {b.label}
          </Link>
        ))}
      </div>

      <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
        {WINDOWS.map((w) => (
          <Link
            key={w.id}
            href={makeLeaderboardHref(params, { window: w.id })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              w.id === params.window
                ? "bg-[#1C4B3B] text-white"
                : "text-[#1C4B3B] hover:bg-background"
            )}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {params.board === "sprint" && (
        <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
          {SPRINT_MODES.map((m) => (
            <Link
              key={m.id}
              href={makeLeaderboardHref(params, { mode: m.id })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                m.id === params.mode
                  ? "bg-[#1C4B3B] text-white"
                  : "text-[#1C4B3B] hover:bg-background"
              )}
            >
              {m.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
