import { createClient } from "@/lib/supabase/server";
import {
  TOP_N,
  fetchLeaderboardUsers,
  getCachedLeaderboardRows,
  type LeaderboardParams,
} from "@/lib/leaderboard";
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow";

export async function LeaderboardRows({ params }: { params: LeaderboardParams }) {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const { rows } = await getCachedLeaderboardRows(params);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Nothing here yet — be the first on the board!
      </p>
    );
  }

  const visible = rows.slice(0, TOP_N);
  const yourIndex = user ? rows.findIndex((r) => r.userId === user.id) : -1;
  const yourRow = yourIndex >= 0 ? rows[yourIndex] : null;
  const idsToFetch = [
    ...new Set([...visible.map((r) => r.userId), ...(yourRow ? [yourRow.userId] : [])]),
  ];
  const usersById = await fetchLeaderboardUsers(idsToFetch);
  const yourRankOffScreen = yourIndex >= TOP_N;

  return (
    <>
      {visible.map((row, i) => (
        <LeaderboardRow
          key={row.userId}
          rank={i + 1}
          row={row}
          info={usersById.get(row.userId)}
          isYou={user?.id === row.userId}
          showMode={params.board === "sprint"}
        />
      ))}

      {yourRankOffScreen && yourRow && (
        <div className="sticky bottom-4 mt-4">
          <div className="overflow-hidden rounded-lg border-2 border-primary bg-card shadow-md">
            <LeaderboardRow
              rank={yourIndex + 1}
              row={yourRow}
              info={usersById.get(yourRow.userId)}
              isYou
              showMode={params.board === "sprint"}
            />
          </div>
        </div>
      )}
    </>
  );
}
