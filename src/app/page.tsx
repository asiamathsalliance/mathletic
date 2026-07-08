import { Suspense } from "react";
import { ProblemFilters } from "@/components/problems/ProblemFilters";
import { ProblemTable } from "@/components/problems/ProblemTable";
import { getAllQuestions } from "@/lib/questions";

export default function HomePage() {
  const total = getAllQuestions().length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Problems</h1>
        <p className="text-muted-foreground mt-1">
          {total} questions across HSC, IB, AP, and A-Level
        </p>
      </div>

      <Suspense fallback={<div className="h-10 bg-muted rounded animate-pulse" />}>
        <ProblemFilters />
      </Suspense>

      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ProblemTable />
      </Suspense>
    </div>
  );
}
