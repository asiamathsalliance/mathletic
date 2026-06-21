import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/PageHeading";
import {
  CURRICULUM_STREAMS,
  getCurriculumTitle,
  topicToSlug,
} from "@/lib/curriculumStreams";
import type { Curriculum } from "@/types/question";

const SLUG_TO_CURRICULUM: Record<string, Curriculum> = {
  hsc: "HSC",
  ib: "IB",
  ap: "AP",
  "a-level": "A-Level",
};

interface PageProps {
  params: Promise<{ curriculum: string }>;
}

export default async function CurriculumPage({ params }: PageProps) {
  const { curriculum: slug } = await params;
  const curriculum = SLUG_TO_CURRICULUM[slug?.toLowerCase() ?? ""];
  if (!curriculum) notFound();

  const streams = CURRICULUM_STREAMS[curriculum];
  const basePath = `/${slug.toLowerCase()}`;

  return (
    <div className="space-y-8">
      <PageHeading
        title={getCurriculumTitle(curriculum)}
        subtitle="Select a stream and topic to practice past exam questions."
      />
      <div className="space-y-8">
        {streams.map((stream, index) => (
          <div key={stream.id}>
            {index > 0 && (
              <div className="my-8 h-px bg-border" role="separator" />
            )}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Practice
                </span>
                <span>{stream.label}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stream.topics.map((topic) => (
                  <Link
                    key={topic}
                    href={`${basePath}/${stream.id}/${topicToSlug(topic)}`}
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full h-auto py-6 text-lg font-medium justify-center text-left"
                    >
                      {topic}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Exam · Mock — Mock 1, Mock 2 for this curriculum */}
      <section className="space-y-3 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-md bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            Exam
          </span>
          <span>Mock</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl">
          <Link href={`/practice-exam/${slug?.toLowerCase()}/mock-1`}>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-auto py-3 text-sm font-medium justify-center"
            >
              Mock 1
            </Button>
          </Link>
          <Link href={`/practice-exam/${slug?.toLowerCase()}/mock-2`}>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-auto py-3 text-sm font-medium justify-center"
            >
              Mock 2
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
