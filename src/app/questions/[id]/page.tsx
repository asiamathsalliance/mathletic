import { notFound } from "next/navigation";
import { QuestionDetail } from "@/components/QuestionDetail";
import { getQuestionById } from "@/lib/questions";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

function safeBackHref(from?: string): string {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return "/";
  return from;
}

export default async function QuestionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const question = await getQuestionById(id);

  if (!question) notFound();

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <QuestionDetail question={question} backHref={safeBackHref(from)} />
    </div>
  );
}
