import { Suspense } from "react";
import { ProblemFilters } from "@/components/problems/ProblemFilters";
import { ProblemTable } from "@/components/problems/ProblemTable";
import { StatsStrip } from "@/components/problems/StatsStrip";
import { buildPracticeList } from "@/lib/practiceList";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toURLSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
  }
  if (!params.has("pageSize")) params.set("pageSize", String(DEFAULT_PAGE_SIZE));
  return params;
}

export default async function HomePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const params = toURLSearchParams(raw);
  const initial = await buildPracticeList(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Problems</h1>
        <p className="text-muted-foreground mt-1">
          {initial.bankTotal.toLocaleString()} questions — AMC 10/12, HSC, IB, AP, and A-Level
        </p>
      </div>

      <Suspense fallback={null}>
        <StatsStrip />
      </Suspense>

      <Suspense fallback={<div className="h-10 bg-muted rounded animate-pulse" />}>
        <ProblemFilters
          topics={initial.topics}
          bankTotal={initial.bankTotal}
          initialFilteredTotal={initial.total}
        />
      </Suspense>

      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ProblemTable
          initialItems={initial.items}
          initialTotal={initial.total}
          initialPage={initial.page}
          initialPageSize={initial.pageSize}
        />
      </Suspense>
    </div>
  );
}
