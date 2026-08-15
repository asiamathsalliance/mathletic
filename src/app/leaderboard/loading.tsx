/**
 * Suppresses the root `app/loading.tsx` problem-table skeleton on this route.
 * The real placeholder is the in-page Suspense fallback (`LeaderboardSkeletonRows`)
 * which only pulses player names once the page chrome streams in.
 */
export default function LeaderboardLoading() {
  return null;
}
