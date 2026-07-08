"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  playCategoryFromSlug,
  PLAY_CATEGORY_LABELS,
  DEFAULT_MCQ_COUNT,
} from "@/lib/playConfig";
import { getPlayQuestionPool } from "@/lib/questions";
import { DIFFICULTIES } from "@/types/question";
import { CURRICULUM_STREAMS } from "@/lib/curriculumStreams";
import type { PlayCategory } from "@/lib/playConfig";

export function ChallengeSetupClient() {
  const params = useParams();
  const router = useRouter();
  const categorySlug = String(params.category ?? "");
  const category = playCategoryFromSlug(categorySlug);

  const topics = useMemo(() => {
    if (!category) return [];
    const streams = CURRICULUM_STREAMS[category as PlayCategory];
    if (!streams) return [];
    const set = new Set<string>();
    streams.forEach((s) => s.topics.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [category]);

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const pool = useMemo(() => {
    if (!category) return { mcq: [], long: [] };
    return getPlayQuestionPool(category, {
      topic: topic || undefined,
      difficulty: difficulty || undefined,
    });
  }, [category, topic, difficulty]);

  if (!category) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="pt-6">
          <p>Category not found.</p>
          <Link href="/challenge" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            Back
          </Link>
        </CardContent>
      </Card>
    );
  }

  const canStart = pool.mcq.length >= 1 && pool.long.length >= 1;

  const handleStart = () => {
    const qs = new URLSearchParams();
    if (topic) qs.set("topic", topic);
    if (difficulty) qs.set("difficulty", difficulty);
    router.push(`/challenge/${categorySlug}/run${qs.toString() ? `?${qs}` : ""}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-page-title">{PLAY_CATEGORY_LABELS[category]}</h1>
        <p className="text-muted-foreground mt-1">
          {DEFAULT_MCQ_COUNT} timed MCQs + 1 long-answer check
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-section-header">Session options</CardTitle>
          <CardDescription>Optional filters for question pool</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-meta">Topic</label>
            <Select
              value={topic || "all"}
              onValueChange={(v) => setTopic(!v || v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-meta">Difficulty</label>
            <Select
              value={difficulty || "all"}
              onValueChange={(v) => setDifficulty(!v || v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground rounded-md bg-muted p-3">
            Pool: {pool.mcq.length} MCQ · {pool.long.length} long answer
            {!canStart && (
              <span className="block mt-1 text-red-700">
                Need at least 1 MCQ and 1 long-answer question.
              </span>
            )}
          </p>

          <Button className="w-full" disabled={!canStart} onClick={handleStart}>
            Start challenge
          </Button>
          <Link href="/challenge" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Back
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
