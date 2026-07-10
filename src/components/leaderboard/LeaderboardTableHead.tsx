import {
  ROW_GAP,
  ROW_GRID,
  SPRINT_ROW_GRID,
  type Board,
} from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

export function LeaderboardTableHead({
  board,
  valueLabel,
}: {
  board: Board;
  valueLabel: string;
}) {
  return (
    <div
      className={cn(
        "grid items-center border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        ROW_GAP,
        board === "sprint" ? SPRINT_ROW_GRID : ROW_GRID
      )}
    >
      <span>#</span>
      <span>Player</span>
      <span className="justify-self-center text-center">{valueLabel}</span>
      {board === "sprint" && <span className="justify-self-center text-center">Mode</span>}
    </div>
  );
}
