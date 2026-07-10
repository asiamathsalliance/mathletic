import {
  ROW_GAP,
  ROW_GRID,
  SPRINT_ROW_GRID,
  type Board,
} from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

export function LeaderboardSkeletonRows({
  board,
  count = 8,
}: {
  board: Board;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            "grid animate-pulse items-center border-b border-border px-4 py-2.5 last:border-0",
            ROW_GAP,
            board === "sprint" ? SPRINT_ROW_GRID : ROW_GRID
          )}
        >
          <div className="h-4 w-5 rounded bg-muted" />
          <div className="flex min-w-0 items-center gap-2">
            <div className="size-6 shrink-0 rounded-full bg-muted" />
            <div className="h-4 w-32 max-w-full rounded bg-muted" />
          </div>
          <div className="mx-auto h-4 w-10 rounded bg-muted" />
          {board === "sprint" && <div className="mx-auto h-4 w-14 rounded bg-muted" />}
        </div>
      ))}
    </>
  );
}
