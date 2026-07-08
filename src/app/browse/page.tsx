"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CURRICULA } from "@/types/question";
import { CURRICULUM_STREAMS, topicToSlug } from "@/lib/curriculumStreams";
import { CURRICULUM_INFO } from "@/lib/curriculumCards";
import { getSimpleTopic } from "@/lib/questionTable";
import { ChevronRight, Calculator, Sigma, BarChart3, Waypoints, FunctionSquare } from "lucide-react";

const OLYMPIAD_ITEMS = [
  { label: "AMC 8", slug: "amc-8" },
  { label: "AMC 10", slug: "amc-10" },
  { label: "AMC 12", slug: "amc-12" },
  { label: "AIME", slug: "aime" },
];

const curriculumTitleClass: Record<(typeof CURRICULA)[number], string> = {
  HSC: "text-[#1C4B3B]",
  IB: "text-[#8A6410]",
  AP: "text-[#235682]",
  "A-Level": "text-[#55661A]",
};

function TopicIcon({ topic }: { topic: string }) {
  const simple = getSimpleTopic(topic);
  if (simple.includes("Calculus")) return <Calculator className="size-4" />;
  if (simple.includes("Probability") || simple.includes("Statistics")) return <BarChart3 className="size-4" />;
  if (simple.includes("Algebra") || simple.includes("Functions")) return <FunctionSquare className="size-4" />;
  if (simple.includes("Networks") || simple.includes("Vectors")) return <Waypoints className="size-4" />;
  return <Sigma className="size-4" />;
}

export default function BrowsePage() {
  const initial = useMemo(() => {
    const obj: Record<string, string> = {};
    CURRICULA.forEach((c) => {
      obj[c] = CURRICULUM_STREAMS[c][0]?.id ?? "";
    });
    return obj;
  }, []);

  const [activeStreamByCurriculum, setActiveStreamByCurriculum] = useState<Record<string, string>>(initial);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-page-title">Curricula</h1>
      </div>

      <section className="space-y-5">
        {CURRICULA.map((curriculum) => {
          const info = CURRICULUM_INFO[curriculum];
          const streams = CURRICULUM_STREAMS[curriculum];
          const slug = info.slug;
          const activeId = activeStreamByCurriculum[curriculum] || streams[0]?.id;
          const activeStream = streams.find((s) => s.id === activeId) ?? streams[0];

          return (
            <div key={curriculum} className="rounded-2xl border-2 border-border bg-card p-6">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className={`text-2xl font-semibold ${curriculumTitleClass[curriculum]}`}>{info.label}</h2>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </div>

                {streams.length > 1 && (
                  <div className="inline-flex rounded-full border border-border bg-muted/70 p-1">
                    {streams.map((stream) => {
                      const active = stream.id === activeId;
                      return (
                        <button
                          key={stream.id}
                          type="button"
                          onClick={() =>
                            setActiveStreamByCurriculum((prev) => ({
                              ...prev,
                              [curriculum]: stream.id,
                            }))
                          }
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            active
                              ? "bg-[#1C4B3B] text-white"
                              : "text-[#1C4B3B] hover:bg-background"
                          }`}
                        >
                          {stream.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {activeStream.topics.length} topics
              </p>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeStream.topics.map((topic) => (
                  <li key={topic}>
                    <Link
                      href={`/${slug}/${activeStream.id}/${topicToSlug(topic)}`}
                      className="flex min-h-[60px] items-center gap-3 rounded-xl border border-border bg-[#FCFBF7] px-4 py-3 text-sm text-foreground transition-colors hover:border-[#1C4B3B] hover:bg-[#E7EFE9]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E7EFE9] text-[#1C4B3B]">
                        <TopicIcon topic={topic} />
                      </span>
                      <span className="flex-1 min-w-0 truncate">{topic}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-section-header">Olympiad</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {OLYMPIAD_ITEMS.map((item) => (
            <Link key={item.slug} href={`/olympiad/${item.slug}`}>
              <div className="rounded-xl border-2 border-border bg-card px-4 py-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
