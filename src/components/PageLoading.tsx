/** Shared route-level loading skeleton for app segments. */
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label={label}>
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full rounded-md bg-muted/70" />
      </div>
      <div className="space-y-3">
        <div className="h-14 rounded-xl border border-border bg-muted/40" />
        <div className="h-14 rounded-xl border border-border bg-muted/40" />
        <div className="h-14 rounded-xl border border-border bg-muted/40" />
        <div className="h-14 rounded-xl border border-border bg-muted/40" />
        <div className="h-14 rounded-xl border border-border bg-muted/40" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Profile / settings style skeleton (header + cards). */
export function ProfilePageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label={label}>
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-40 rounded-md bg-muted" />
          <div className="h-4 w-56 max-w-full rounded-md bg-muted/70" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-xl border border-border bg-muted/40" />
        <div className="h-28 rounded-xl border border-border bg-muted/40" />
      </div>
      <div className="h-40 rounded-xl border border-border bg-muted/40" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Practice bank table skeleton. */
export function ProblemTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card animate-pulse"
      role="status"
      aria-label="Loading problems"
    >
      <div className="hidden md:grid grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_12rem_6.5rem] gap-2.5 border-b border-border bg-muted/40 px-4 py-2">
        <div className="h-3 w-3 rounded bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-3 w-10 justify-self-end rounded bg-muted" />
        <div className="h-3 w-14 justify-self-end rounded bg-muted" />
        <div className="h-3 w-14 justify-self-end rounded bg-muted" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1.25rem_minmax(0,1fr)_3.5rem_12rem_6.5rem] items-center gap-2.5 border-b border-border px-4 py-3 last:border-0"
        >
          <div className="size-4 rounded-full bg-muted/60" />
          <div className="h-4 w-[85%] max-w-full rounded bg-muted/70" />
          <div className="h-4 w-10 justify-self-end rounded bg-muted/60" />
          <div className="hidden h-3 w-20 justify-self-end rounded bg-muted/50 md:block" />
          <div className="hidden h-5 w-14 justify-self-end rounded-full bg-muted/50 sm:block" />
        </div>
      ))}
      <span className="sr-only">Loading problems…</span>
    </div>
  );
}

/** Question detail / MCQ skeleton. */
export function QuestionDetailSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[920px] space-y-4 animate-pulse"
      role="status"
      aria-label="Loading question"
    >
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full bg-muted" />
          <div className="h-5 w-14 rounded-full bg-muted" />
          <div className="h-5 w-28 rounded bg-muted/70" />
        </div>
        <div className="space-y-2.5">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-[92%] rounded bg-muted" />
          <div className="h-4 w-[78%] rounded bg-muted" />
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md border border-border bg-muted/40" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading question…</span>
    </div>
  );
}
