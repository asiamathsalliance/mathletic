/**
 * Loading shell that mirrors SprintEntry (landing / mode selection),
 * not the in-session play UI.
 */
export function SprintEntrySkeleton() {
  return (
    <div
      className="mx-auto flex min-h-[70vh] max-w-4xl animate-pulse flex-col items-center justify-center px-4 py-12"
      role="status"
      aria-label="Loading sprint"
    >
      {/* Title + blurb */}
      <div className="mb-2 h-9 w-64 max-w-full rounded-md bg-muted" />
      <div className="mb-12 h-4 w-80 max-w-full rounded-md bg-muted/70" />

      {/* Mode cards — same grid as signed-in SprintEntry */}
      <div className="grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-8 shadow-md"
          >
            <div className="mb-4 size-14 rounded-xl bg-muted" />
            <div className="h-6 w-44 max-w-full rounded-md bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-3.5 w-full rounded bg-muted/70" />
              <div className="h-3.5 w-[88%] rounded bg-muted/70" />
            </div>
            {/* Personal bests slot */}
            <div className="mt-4 h-4 w-40 rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Leaderboard link */}
      <div className="mt-10 h-4 w-44 rounded bg-muted/50" />

      <span className="sr-only">Loading sprint…</span>
    </div>
  );
}
