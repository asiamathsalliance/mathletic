import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/PageHeading";

const OLYMPIAD_ITEMS: Record<string, { label: string; description: string }> = {
  "amc-8": { label: "AMC 8", description: "American Mathematics Competition 8" },
  "amc-10": { label: "AMC 10", description: "American Mathematics Competition 10" },
  "amc-12": { label: "AMC 12", description: "American Mathematics Competition 12" },
  "aime": { label: "AIME", description: "American Invitational Mathematics Examination" },
  "national-olympiad": { label: "National Olympiad", description: "National Mathematics Olympiad" },
};

const TOPICS = ["Algebra", "Functions", "Calculus", "Trigonometry", "Probability", "Vectors"];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function OlympiadPage({ params }: PageProps) {
  const { slug } = await params;
  const item = OLYMPIAD_ITEMS[slug?.toLowerCase() ?? ""];
  if (!item) notFound();

  return (
    <div className="space-y-8">
      <PageHeading
        title={item.label}
        subtitle={`${item.description} — Select a topic to practice.`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPICS.map((topic) => {
          const topicSlug = topic.toLowerCase().replace(/\s+/g, "-");
          return (
            <Link key={topic} href={`/olympiad/${slug}/${topicSlug}`}>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-auto py-6 text-lg font-medium justify-center"
              >
                {topic}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
