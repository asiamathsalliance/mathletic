"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CURRICULA } from "@/types/question";
import { CURRICULUM_STREAMS, topicToSlug } from "@/lib/curriculumStreams";
import { CURRICULUM_INFO } from "@/lib/curriculumCards";
import { AMC_BROWSE_TOPICS } from "@/lib/competitions";
import { getSimpleTopic } from "@/lib/questionTable";
import {
  ChevronRight,
  Calculator,
  Sigma,
  BarChart3,
  Waypoints,
  FunctionSquare,
  Shapes,
  Hash,
} from "lucide-react";

const AMC_COMPETITIONS = [
  {
    id: "AMC10" as const,
    label: "AMC 10",
    titleClass: "text-[#5D3A80]",
    accentClass: "text-[#5D3A80]",
    cardHover: "hover:border-[#7B4FA6] hover:bg-[#F3EDF8]",
    iconBg: "bg-[#EDE4F4]",
  },
  {
    id: "AMC12" as const,
    label: "AMC 12",
    titleClass: "text-[#803D3A]",
    accentClass: "text-[#803D3A]",
    cardHover: "hover:border-[#A6524F] hover:bg-[#F8EDEC]",
    iconBg: "bg-[#F5E4E3]",
  },
];

const curriculumTitleClass: Record<(typeof CURRICULA)[number], string> = {
  HSC: "text-[#1C4B3B]",
  IB: "text-[#8A6410]",
  AP: "text-[#235682]",
  "A-Level": "text-[#55661A]",
};

function TopicIcon({ topic }: { topic: string }) {
  if (topic === "Geometry") return <Shapes className="size-4" />;
  if (topic === "Number Theory") return <Hash className="size-4" />;
  if (topic === "Counting & Probability") return <BarChart3 className="size-4" />;
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
    <div className="space-y-10">
      {/* Competition */}
      <section className="space-y-5">
        <h1 className="text-page-title">Competition</h1>

        {AMC_COMPETITIONS.map((comp) => (
          <div key={comp.id} className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="mb-5">
              <h2 className={`text-2xl font-semibold ${comp.titleClass}`}>{comp.label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Past AMC problems by topic — 25 questions per exam, multiple choice.
              </p>
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {AMC_BROWSE_TOPICS.length} topics
            </p>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AMC_BROWSE_TOPICS.map((topic) => (
                <li key={topic}>
                  <Link
                    href={`/?competition=${comp.id}&topic=${encodeURIComponent(topic)}`}
                    className={`flex min-h-[60px] items-center gap-3 rounded-xl border border-border bg-[#FCFBF7] px-4 py-3 text-sm text-foreground transition-colors ${comp.cardHover}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${comp.iconBg} ${comp.accentClass}`}
                    >
                      <TopicIcon topic={topic} />
                    </span>
                    <span className="flex-1 min-w-0">{topic}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Curricula */}
      <section className="space-y-5">
        <h1 className="text-page-title">Curricula</h1>

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
    </div>
  );
}
