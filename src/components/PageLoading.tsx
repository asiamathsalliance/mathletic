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
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
