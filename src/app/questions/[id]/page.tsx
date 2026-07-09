import { notFound } from "next/navigation";
import { QuestionDetail } from "@/components/QuestionDetail";
import { getQuestionById } from "@/lib/questions";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function QuestionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const question = await getQuestionById(id);

  if (!question) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <QuestionDetail question={question} backHref={from ?? "/"} />
    </div>
  );
}
