import Link from "next/link";
import { socialInitial } from "@/lib/profile/avatar";
import {
  ROW_GAP,
  ROW_GRID,
  SPRINT_ROW_GRID,
  type LeaderboardRow,
  type LeaderboardUserInfo,
} from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

export function LeaderboardRow({
  rank,
  row,
  info,
  isYou,
  showMode = false,
}: {
  rank: number;
  row: LeaderboardRow;
  info?: LeaderboardUserInfo;
  isYou: boolean;
  showMode?: boolean;
}) {
  const username = info?.displayLabel ?? "anonymous";
  const profileSlug = info?.profileSlug;
  const initial = socialInitial(profileSlug ?? username);
  const rankColor =
    rank === 1
      ? "text-[#C9941F]"
      : rank === 2
        ? "text-[#8A8A8A]"
        : rank === 3
          ? "text-[#A6524F]"
          : "text-muted-foreground";

  return (
    <div
      className={cn(
        "grid items-center border-b border-border px-4 py-2.5 last:border-0",
        ROW_GAP,
        showMode ? SPRINT_ROW_GRID : ROW_GRID,
        isYou && "bg-primary/10"
      )}
    >
      <span className={cn("text-sm font-semibold tabular-nums", rankColor)}>{rank}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {initial}
        </span>
        {profileSlug ? (
          <Link
            href={`/u/${profileSlug}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {username}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium">{username}</span>
        )}
        {isYou && <span className="ml-1.5 shrink-0 text-xs text-muted-foreground">(you)</span>}
        {!showMode && row.detail && (
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            {row.detail}
          </span>
        )}
      </span>
      <span className="justify-self-center text-center text-sm font-semibold tabular-nums">
        {row.value}
      </span>
      {showMode && (
        <span className="justify-self-center text-center text-xs font-medium text-muted-foreground">
          {row.modeLabel ?? "—"}
        </span>
      )}
    </div>
  );
}
