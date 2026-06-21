import { notFound } from "next/navigation";
import { PageHeading } from "@/components/PageHeading";

const OLYMPIAD_ITEMS: Record<string, { label: string }> = {
  "amc-8": { label: "AMC 8" },
  "amc-10": { label: "AMC 10" },
  "amc-12": { label: "AMC 12" },
  "aime": { label: "AIME" },
  "national-olympiad": { label: "National Olympiad" },
};

const TOPIC_SLUG_TO_NAME: Record<string, string> = {};
["Algebra", "Functions", "Calculus", "Trigonometry", "Probability", "Vectors"].forEach(
  (t) => { TOPIC_SLUG_TO_NAME[t.toLowerCase().replace(/\s+/g, "-")] = t; }
);

interface PageProps {
  params: Promise<{ slug: string; topic: string }>;
}

export default async function OlympiadTopicPage({ params }: PageProps) {
  const { slug, topic: topicSlug } = await params;
  const item = OLYMPIAD_ITEMS[slug?.toLowerCase() ?? ""];
  const topicName = topicSlug ? TOPIC_SLUG_TO_NAME[topicSlug.toLowerCase()] : undefined;
  if (!item || !topicName) notFound();

  return (
    <div className="space-y-6">
      <PageHeading
        title={topicName}
        subtitle={`${item.label} · Olympiad practice`}
      />
      <p className="text-muted-foreground py-8">
        Questions for this section are coming soon. Check back later or use the search bar to find other content.
      </p>
    </div>
  );
}
