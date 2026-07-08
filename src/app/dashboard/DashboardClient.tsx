"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllQuestions } from "@/lib/questions";
import {
  getSolvedCountsByDifficulty,
  getCurriculumProgress,
} from "@/lib/progress";
import {
  getActivityByDay,
  getRecentActivity,
  getAggregateAccuracy,
  getMaxStreak,
  getSolvedByDifficulty,
} from "@/lib/progressStats";
import { getGameProfile, BADGE_LABELS, type BadgeId } from "@/lib/gameProfile";
import { PLAY_CATEGORIES } from "@/lib/playConfig";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";

export function DashboardClient() {
  const allQuestions = useMemo(() => getAllQuestions(), []);
  const solvedStats = useMemo(() => getSolvedCountsByDifficulty(allQuestions), [allQuestions]);
  const curriculumProgress = useMemo(() => getCurriculumProgress(allQuestions), [allQuestions]);
  const activity = useMemo(() => getActivityByDay(365), []);
  const recent = useMemo(() => getRecentActivity(12), []);
  const accuracy = useMemo(() => getAggregateAccuracy(), []);
  const streak = useMemo(() => getMaxStreak(), []);
  const byDiff = useMemo(() => getSolvedByDifficulty(), []);
  const profile = useMemo(() => getGameProfile(), []);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const allBadges = new Set<BadgeId>(
    PLAY_CATEGORIES.flatMap((c) => profile.categories[c].badges)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your practice progress</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Solved" value={`${solvedStats.solvedTotal}/${solvedStats.total}`} />
        <StatCard label="Accuracy" value={accuracy > 0 ? `${accuracy}%` : "—"} />
        <StatCard label="Streak" value={`${streak}d`} />
        <StatCard label="Challenges" value={String(profile.runHistory.length)} />
      </div>

      <Card className="border-2 border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-section-header">Activity</CardTitle>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap data={activity} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-section-header">Solved by difficulty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["Easy", "Medium", "Hard"] as const).map((d) => (
              <div key={d} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{d}</span>
                <span className="font-medium">
                  {byDiff[d]} / {solvedStats.byDifficulty[d].total}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-section-header">Solved by curriculum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(curriculumProgress).map(([cur, p]) => (
              <div key={cur} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{cur}</span>
                  <span className="font-medium">
                    {p.solved}/{p.total}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, p.percent)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                    {p.percent}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {allBadges.size > 0 && (
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-section-header">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[...allBadges].map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {BADGE_LABELS[id]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-section-header">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Start practicing!</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0"
                >
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {item.meta} · {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-2 border-border">
      <CardContent className="pt-2">
        <p className="text-meta">{label}</p>
        <p className="text-2xl font-semibold mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}
