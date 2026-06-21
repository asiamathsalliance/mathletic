"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { GameCard } from "@/components/play/GameCard";
import { GameButton } from "@/components/play/GameButton";
import {
  playCategoryFromSlug,
  PLAY_CATEGORY_LABELS,
  DEFAULT_MCQ_COUNT,
} from "@/lib/playConfig";
import { getPlayQuestionPool } from "@/lib/questions";
import { DIFFICULTIES } from "@/types/question";
import { CURRICULUM_STREAMS } from "@/lib/curriculumStreams";
import type { PlayCategory } from "@/lib/playConfig";

export function PlaySetupClient() {
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
      <div className="play-subpage max-w-xl mx-auto">
      <GameCard>
        <p className="font-bold">Category not found.</p>
        <Link href="/play">
          <GameButton variant="secondary" className="mt-4">
            Back
          </GameButton>
        </Link>
      </GameCard>
      </div>
    );
  }

  const canStart = pool.mcq.length >= 1 && pool.long.length >= 1;

  const handleStart = () => {
    const qs = new URLSearchParams();
    if (topic) qs.set("topic", topic);
    if (difficulty) qs.set("difficulty", difficulty);
    router.push(`/play/${categorySlug}/run${qs.toString() ? `?${qs}` : ""}`);
  };

  return (
    <div className="play-subpage max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2 play-section-head">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--game-forest)] font-[family-name:var(--font-game-heading)]">
          {PLAY_CATEGORY_LABELS[category]}
        </h1>
        <p className="font-semibold text-[var(--game-forest)]/80">
          {DEFAULT_MCQ_COUNT} speed-round MCQs + 1 boss check
        </p>
      </div>

      <GameCard className="space-y-5">
        <div className="space-y-2">
          <label className="font-bold text-[var(--game-forest)]">Topic (optional)</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-xl border-[3px] border-[var(--game-forest)] bg-[var(--game-cream)] p-3 font-semibold"
          >
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-bold text-[var(--game-forest)]">Difficulty (optional)</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-xl border-[3px] border-[var(--game-forest)] bg-[var(--game-cream)] p-3 font-semibold"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border-[3px] border-[var(--game-forest)] bg-[var(--game-sage)]/40 p-4 font-bold text-sm text-[var(--game-forest)]">
          Pool: {pool.mcq.length} MCQ · {pool.long.length} long answer
          {!canStart && (
            <p className="mt-2 text-black">
              Need at least 1 MCQ and 1 long-answer question. Widen your filters.
            </p>
          )}
        </div>

        <GameButton className="w-full" disabled={!canStart} onClick={handleStart}>
          Start run
        </GameButton>
        <Link href="/play">
          <GameButton variant="secondary" className="w-full">
            Choose another mode
          </GameButton>
        </Link>
      </GameCard>
    </div>
  );
}
