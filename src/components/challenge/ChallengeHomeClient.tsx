"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAY_CATEGORIES, PLAY_CATEGORY_LABELS, PLAY_CATEGORY_SLUG } from "@/lib/playConfig";
import type { PlayCategory } from "@/lib/playConfig";

export function ChallengeHomeClient() {
  const [category, setCategory] = useState<PlayCategory>("HSC");

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-page-title">Timed Challenge</h1>
        <p className="text-muted-foreground mt-1">
          Speed-round MCQs followed by a long-answer boss check. Optional practice mode.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-section-header">Start a session</CardTitle>
          <CardDescription>
            5 timed MCQs + 1 long-answer question
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-meta">Curriculum</label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as PlayCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {PLAY_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Link
            href={`/challenge/${PLAY_CATEGORY_SLUG[category]}/setup`}
            className={buttonVariants({ className: "w-full" })}
          >
            Configure & start
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
