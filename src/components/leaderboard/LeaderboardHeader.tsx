import { Trophy } from "lucide-react";

export function LeaderboardHeader() {
  return (
    <div>
      <h1 className="text-page-title flex items-center gap-2">
        <Trophy className="size-7 text-[#C9941F]" />
        Leaderboard
      </h1>
      <p className="text-muted-foreground mt-1">
        Most solved, best sprint scores, and topic specialists.
      </p>
    </div>
  );
}
