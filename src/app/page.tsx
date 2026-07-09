import { Suspense } from "react";
import { ProblemFilters } from "@/components/problems/ProblemFilters";
import { ProblemTable } from "@/components/problems/ProblemTable";
import { StatsStrip } from "@/components/problems/StatsStrip";
import { getAllQuestions } from "@/lib/questions";

// Questions live in the DB — always render with fresh data.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const questions = await getAllQuestions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Problems</h1>
        <p className="text-muted-foreground mt-1">
          {questions.length} questions — AMC 10/12, HSC, IB, AP, and A-Level
        </p>
      </div>

      <Suspense fallback={null}>
        <StatsStrip />
      </Suspense>

      <Suspense fallback={<div className="h-10 bg-muted rounded animate-pulse" />}>
        <ProblemFilters questions={questions} />
      </Suspense>

      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ProblemTable questions={questions} />
      </Suspense>
    </div>
  );
}
