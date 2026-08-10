import { cn } from "@/lib/utils";

/**
 * Loading shell that mirrors SprintPlayClient running layout
 * (header + problem card + MCQ rows) so start → play has no layout jump.
 */
export function SprintPlaySkeleton({
  mode = "PROBLEM_POOL",
  className,
}: {
  mode?: "PROBLEM_POOL" | "MULTIPLICATION";
  className?: string;
}) {
  const isProblem = mode === "PROBLEM_POOL";

  return (
    <div
      className={cn("mx-auto max-w-2xl animate-pulse px-4 pb-12", className)}
      role="status"
      aria-label="Starting sprint"
    >
      {/* Header — matches running: back | stats | timer */}
      <div className="mb-6 flex items-center justify-between gap-4 pt-2">
        {isProblem ? (
          <div className="flex w-14 shrink-0 items-center justify-start">
            <div className="ml-0 size-7 rounded-md bg-muted" />
          </div>
        ) : (
          <div className="h-4 w-20 rounded bg-muted" />
        )}

        {isProblem ? (
          <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted" />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-3">
          {!isProblem && <div className="h-3 w-14 rounded bg-muted" />}
          {/* Ring timer placeholder — same 56px as SprintRingTimer */}
          <div className="size-14 rounded-full border-[4px] border-muted bg-transparent" />
        </div>
      </div>

      {/* Play area */}
      {isProblem ? (
        <div className="relative z-10 mx-auto max-w-2xl space-y-5">
          <div className="space-y-5 rounded-xl border border-border bg-card p-6">
            <div className="space-y-2.5">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-[92%] rounded bg-muted" />
              <div className="h-4 w-[78%] rounded bg-muted" />
              <div className="h-4 w-[64%] rounded bg-muted" />
            </div>
            <div className="relative z-10 flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex w-full items-center gap-3 rounded-md border border-border px-4 py-3"
                >
                  <div className="size-7 shrink-0 rounded-full bg-muted" />
                  <div className="h-3.5 flex-1 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-md space-y-6">
          <div className="rounded-2xl border border-border bg-card px-4 py-8 shadow-sm">
            <div className="mx-auto h-12 w-48 rounded-lg bg-muted" />
            <div className="mt-6 border-t border-border pt-5">
              <div className="mx-auto h-10 w-32 rounded bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl border border-border bg-muted/50" />
            ))}
          </div>
        </div>
      )}

      <span className="sr-only">Starting sprint…</span>
    </div>
  );
}
