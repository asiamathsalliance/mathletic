import { ProblemTableSkeleton } from "@/components/PageLoading";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 animate-pulse">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full rounded-md bg-muted/70" />
      </div>
      <div className="h-10 animate-pulse rounded-full bg-muted/50" />
      <ProblemTableSkeleton />
    </div>
  );
}
