"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { LatexText } from "@/components/LatexText";
import { problemPoolPoints, type SprintQuestion } from "@/lib/sprint";
import { cn } from "@/lib/utils";

/** Match multiplication sprint feedback hold. */
const FEEDBACK_MS = 250;

export function ProblemPlay({
  sessionId,
  initialQuestion,
  initialPrefetch = [],
  initialAnswerKey = {},
  onAnswered,
  onTimeUp,
  onPoolExhausted,
  frozen,
}: {
  sessionId: string;
  initialQuestion: SprintQuestion;
  initialPrefetch?: SprintQuestion[];
  /** Preloaded correct indices for instant feedback (same feel as multiplication). */
  initialAnswerKey?: Record<string, number>;
  onAnswered: (result: { correct: boolean; points: number }) => void;
  onTimeUp?: () => void;
  onPoolExhausted?: () => void;
  frozen: boolean;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [queue, setQueue] = useState<SprintQuestion[]>(initialPrefetch);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    correctIndex: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const shownAt = useRef(Date.now());
  const seenIds = useRef<string[]>([initialQuestion.id, ...initialPrefetch.map((q) => q.id)]);
  const answerKeyRef = useRef<Record<string, number>>({ ...initialAnswerKey });
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const mergeRefill = useCallback((data: Record<string, unknown>) => {
    const refill = data.question as SprintQuestion | null | undefined;
    if (!refill || typeof data.nextCorrectIndex !== "number") return;
    answerKeyRef.current[refill.id] = data.nextCorrectIndex;
    if (!seenIds.current.includes(refill.id)) seenIds.current.push(refill.id);
    setQueue((prev) => {
      if (prev.some((q) => q.id === refill.id)) return prev;
      return [...prev, refill];
    });
  }, []);

  const answer = useCallback(
    async (index: number) => {
      if (busy || frozen || feedback) return;

      const answeredId = question.id;
      const correctIndex = answerKeyRef.current[answeredId];
      if (typeof correctIndex !== "number") return;

      setBusy(true);
      setSelected(index);

      const timeTakenSeconds = (Date.now() - shownAt.current) / 1000;
      const correct = index === correctIndex;
      const points = problemPoolPoints(correct, timeTakenSeconds);
      const feedbackStartedAt = Date.now();

      // Instant local feedback — same path as multiplication.
      setFeedback({ correct, correctIndex });
      onAnswered({ correct, points });

      const persist = fetch("/api/sprint/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: answeredId,
          answerIndex: index,
          timeTakenSeconds,
          seenIds: seenIds.current,
        }),
      })
        .then(async (res) => ({ ok: res.ok, data: await res.json() }))
        .catch(() => ({ ok: false, data: {} as Record<string, unknown> }));

      const waitMs = Math.max(0, FEEDBACK_MS - (Date.now() - feedbackStartedAt));
      await new Promise((r) => setTimeout(r, waitMs));

      if (frozen) {
        setBusy(false);
        return;
      }

      const queuedNext = queueRef.current[0] ?? null;
      const queuedRest = queueRef.current.slice(1);

      if (queuedNext) {
        // Advance from prefetch immediately; refill appends in the background.
        if (!seenIds.current.includes(queuedNext.id)) seenIds.current.push(queuedNext.id);
        setFeedback(null);
        setSelected(null);
        setQuestion(queuedNext);
        setQueue(queuedRest);
        shownAt.current = Date.now();
        setBusy(false);

        void persist.then((result) => {
          if (!result.ok && result.data.timeUp) {
            onTimeUp?.();
            return;
          }
          if (result.ok) mergeRefill(result.data);
        });
        return;
      }

      // Queue empty — need the API refill before continuing.
      const result = await persist;
      if (!result.ok && result.data.timeUp) {
        onTimeUp?.();
        return;
      }

      const refill = (result.data.question as SprintQuestion | null) ?? null;
      if (refill && typeof result.data.nextCorrectIndex === "number") {
        answerKeyRef.current[refill.id] = result.data.nextCorrectIndex;
        if (!seenIds.current.includes(refill.id)) seenIds.current.push(refill.id);
      }

      if (!refill) {
        onPoolExhausted?.();
        return;
      }

      setFeedback(null);
      setSelected(null);
      setQuestion(refill);
      setQueue([]);
      shownAt.current = Date.now();
      setBusy(false);
    },
    [
      busy,
      frozen,
      feedback,
      sessionId,
      question.id,
      onAnswered,
      onTimeUp,
      onPoolExhausted,
      mergeRefill,
    ]
  );

  useEffect(() => {
    shownAt.current = Date.now();
  }, [question.id]);

  const q = question;
  const locked = busy || frozen || feedback !== null;

  return (
    <div className="relative z-10 mx-auto max-w-2xl space-y-5">
      <div
        className={cn(
          "rounded-xl border bg-card p-6 space-y-5 transition-colors duration-200",
          feedback?.correct && "border-[#2F7D4F] bg-[#2F7D4F]/5",
          feedback && !feedback.correct && "border-[#C94A3D] bg-[#C94A3D]/5",
          !feedback && "border-border"
        )}
      >
        {q.imageUrl && (
          <div className="relative min-h-[180px] w-full overflow-hidden rounded-md border border-border bg-muted/30">
            <Image
              src={q.imageUrl}
              alt="Question diagram"
              fill
              className="object-contain p-2"
              sizes="700px"
              unoptimized={q.imageUrl.startsWith("http")}
            />
          </div>
        )}

        <div className="text-base leading-relaxed">
          <LatexText block>{q.questionText}</LatexText>
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          {q.choices.map((choice, index) => {
            const chosen = selected === index;
            const showCorrect = feedback !== null && index === feedback.correctIndex;
            const showWrong = feedback !== null && chosen && !feedback.correct;
            return (
              <button
                key={`${q.id}-${index}`}
                type="button"
                disabled={locked}
                onClick={() => void answer(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors",
                  "enabled:cursor-pointer enabled:hover:bg-muted/50",
                  "disabled:cursor-default",
                  showCorrect && "border-l-4 border-l-[#2F7D4F] bg-[#2F7D4F]/10 border-border",
                  showWrong && "border-l-4 border-l-[#C94A3D] bg-[#C94A3D]/10 border-border",
                  !showCorrect && !showWrong && "border-border"
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 flex-1 text-sm pointer-events-none">
                  <LatexText>{choice}</LatexText>
                </span>
                {showCorrect && <Check className="size-4 shrink-0 text-[#24603D]" />}
                {showWrong && <X className="size-4 shrink-0 text-[#A03328]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
