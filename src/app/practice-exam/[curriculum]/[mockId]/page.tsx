import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionCard } from "@/components/QuestionCard";
import { PageHeading } from "@/components/PageHeading";
import { getMockQuestions } from "@/lib/questions";
import type { Curriculum } from "@/types/question";

const SLUG_TO_CURRICULUM: Record<string, Curriculum> = {
  hsc: "HSC",
  ib: "IB",
  ap: "AP",
  "a-level": "A-Level",
};

const CURRICULUM_TITLE: Record<Curriculum, string> = {
  HSC: "HSC Mathematics",
  IB: "IB Mathematics",
  AP: "AP Calculus & Statistics",
  "A-Level": "A-Level Mathematics",
};

const MOCK_IDS = ["mock-1", "mock-2"] as const;

interface PageProps {
  params: Promise<{ curriculum: string; mockId: string }>;
}

export default async function PracticeExamPage({ params }: PageProps) {
  const { curriculum: curriculumSlug, mockId } = await params;
  const curriculum = SLUG_TO_CURRICULUM[curriculumSlug?.toLowerCase() ?? ""] as Curriculum | undefined;
  if (!curriculum || !MOCK_IDS.includes(mockId as (typeof MOCK_IDS)[number])) notFound();

  const questions = getMockQuestions(curriculum, mockId, 3);
  const title = `${CURRICULUM_TITLE[curriculum]} · ${mockId === "mock-1" ? "Mock 1" : "Mock 2"}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          title={title}
          subtitle={`${questions.length} practice question${questions.length !== 1 ? "s" : ""} from the question bank.`}
        />
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          ← Back to curriculum
        </Link>
      </div>
      {questions.length === 0 ? (
        <p className="text-muted-foreground">
          No questions available for this mock yet. Try another curriculum or mock.
        </p>
      ) : (
        <ul className="space-y-6">
          {questions.map((q) => (
            <li key={q.id}>
              <QuestionCard question={q} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
