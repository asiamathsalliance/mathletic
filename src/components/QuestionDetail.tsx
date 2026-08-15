"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/LatexText";
import { Check, ChevronLeft, X } from "lucide-react";
import type { Question } from "@/types/question";
import { useProgress } from "@/lib/useProgress";
import { checkAnswerWithLocalModel, type AnswerVerdict } from "@/lib/checkAnswer";
import { InlineAnswerFeedback } from "@/components/play/InlineAnswerFeedback";
import { AiUnavailableModal } from "@/components/AiUnavailableModal";
import { isAiUnavailableError } from "@/lib/aiErrors";
import { AsyDiagram } from "@/components/AsyDiagram";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { CurriculumTag } from "@/components/ui/CurriculumTag";
import { cn } from "@/lib/utils";
import { formatQuestionSourceLabel } from "@/lib/questionUtils";

interface QuestionDetailProps {
  question: Question;
  backHref?: string;
}

const WRONGS_BEFORE_SOLUTION = 3;

export function QuestionDetail({ question, backHref = "/" }: QuestionDetailProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [wrongSelected, setWrongSelected] = useState<Set<number>>(() => new Set());
  const [wrongCount, setWrongCount] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [answerAnalysis, setAnswerAnalysis] = useState<string | null>(null);
  const [answerVerdict, setAnswerVerdict] = useState<AnswerVerdict | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [showAiUnavailable, setShowAiUnavailable] = useState(false);

  const { solvedIds, reportAttempt } = useProgress();
  const correctIndex = question.correctIndex;

  useEffect(() => {
    setIsSolved(false);
    setSelectedChoice(null);
    setWrongSelected(new Set());
    setWrongCount(0);
    setShowSolution(false);
    setStudentAnswer("");
    setAnswerVerdict(null);
    setAnswerAnalysis(null);
  }, [question.id]);

  // Solved state comes from the account-aware progress store (DB when signed
  // in, localStorage otherwise). Never un-solve after a local solve.
  useEffect(() => {
    if (solvedIds.has(question.id)) setIsSolved(true);
  }, [solvedIds, question.id]);

  const imagePath =
    question.image && question.image !== "none" ? question.image : question.questionImage;

  const isMultipleChoice =
    question.choices &&
    question.choices.length >= 4 &&
    typeof correctIndex === "number";

  const answeredCorrect =
    isMultipleChoice && selectedChoice !== null && selectedChoice === correctIndex;

  const solutionUnlocked =
    !isMultipleChoice || wrongCount >= WRONGS_BEFORE_SOLUTION || answeredCorrect;

  const handleCheckAnswer = async () => {
    if (!studentAnswer.trim()) {
      setAnswerError("Please enter your answer before checking.");
      return;
    }
    setAnswerError(null);
    setIsCheckingAnswer(true);
    setAnswerVerdict(null);
    setAnswerAnalysis(null);
    try {
      const result = await checkAnswerWithLocalModel(question.questionText, studentAnswer, {
        curriculum: question.curriculum,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        examSource: question.examSource,
      });
      setAnswerVerdict(result.verdict);
      setAnswerAnalysis(result.analysis);
    } catch (err) {
      if (isAiUnavailableError(err)) {
        setShowAiUnavailable(true);
      } else {
        setAnswerError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </Link>
      </div>

      <Card className="border-border">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <CurriculumTag curriculum={question.curriculum} />
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="text-xs text-muted-foreground">
              {formatQuestionSourceLabel(question)}
            </span>
            {isSolved && (
              <span className="text-xs font-medium text-[#24603D]">Solved</span>
            )}
          </div>

          {imagePath && (
            <div className="relative w-full min-h-[200px] rounded-md border border-border overflow-hidden bg-muted/30">
              <Image
                src={imagePath}
                alt="Question diagram"
                fill
                className="object-contain p-2"
                sizes="800px"
                unoptimized={imagePath.startsWith("http")}
              />
            </div>
          )}

          {!imagePath && question.diagramAsy && (
            <AsyDiagram source={question.diagramAsy} />
          )}

          <div className="text-base leading-relaxed">
            <LatexText block>{question.questionText}</LatexText>
          </div>
        </CardHeader>

        {isMultipleChoice && question.choices && (
          <CardContent className="border-t border-border pt-6">
            <div className="flex flex-col gap-2 mt-1">
              {question.choices.map((choice, index) => {
                const isCorrectChoice = index === correctIndex;
                const showCorrect = answeredCorrect && isCorrectChoice;
                const showWrong =
                  wrongSelected.has(index) || (selectedChoice === index && !isCorrectChoice);
                const locked = answeredCorrect;

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked || typeof correctIndex !== "number") return;
                      const correct = index === correctIndex;
                      setSelectedChoice(index);
                      if (correct) {
                        setIsSolved(true);
                      } else {
                        setWrongSelected((prev) => {
                          if (prev.has(index)) return prev;
                          const next = new Set(prev);
                          next.add(index);
                          return next;
                        });
                        setWrongCount((c) => c + 1);
                      }
                      queueMicrotask(() => {
                        reportAttempt(question, correct);
                      });
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 w-full rounded-lg border-2 px-4 py-3 text-left transition-colors min-h-[3rem]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:cursor-default",
                      showCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                      showWrong && "border-red-500 bg-red-50 dark:bg-red-950/30",
                      !showCorrect &&
                        !showWrong &&
                        "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <span className="font-medium text-muted-foreground shrink-0">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="flex-1 min-w-0 text-sm">
                      <LatexText>{choice}</LatexText>
                    </span>
                    {showCorrect && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    {showWrong && !showCorrect && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!solutionUnlocked && wrongCount > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {WRONGS_BEFORE_SOLUTION - wrongCount} more wrong{" "}
                {WRONGS_BEFORE_SOLUTION - wrongCount === 1 ? "try" : "tries"} to unlock the
                solution
              </p>
            )}
          </CardContent>
        )}

        {!isMultipleChoice && (
          <CardContent className="border-t border-border pt-4 space-y-3">
            <textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Write your working and answer here…"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCheckAnswer}
                disabled={isCheckingAnswer}
              >
                {isCheckingAnswer ? "Checking…" : "Check answer"}
              </Button>
              {!isSolved && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    reportAttempt(question, true);
                    setIsSolved(true);
                  }}
                >
                  Mark completed
                </Button>
              )}
            </div>
            {answerError && <p className="text-sm text-red-700">{answerError}</p>}
            {answerVerdict && (
              <InlineAnswerFeedback
                verdict={answerVerdict}
                analysis={answerAnalysis || "Answer checked."}
              />
            )}
          </CardContent>
        )}

        {showSolution && solutionUnlocked && (
          <CardContent className="border-t border-border pt-4">
            <div className="rounded-md bg-muted/50 border border-border p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Solution</p>
              {question.solutionImage && (
                <div className="relative w-full min-h-[160px] rounded border border-border overflow-hidden">
                  <Image
                    src={question.solutionImage}
                    alt="Solution"
                    fill
                    className="object-contain p-2"
                    unoptimized={question.solutionImage.startsWith("http")}
                  />
                </div>
              )}
              <LatexText block className="text-[15px] leading-7 text-foreground">
                {question.solution}
              </LatexText>
            </div>
          </CardContent>
        )}

        {solutionUnlocked && (
          <CardFooter className="border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setShowSolution((s) => !s)}
            >
              {showSolution ? "Hide solution" : "Show solution"}
            </Button>
          </CardFooter>
        )}
      </Card>

      <AiUnavailableModal open={showAiUnavailable} onClose={() => setShowAiUnavailable(false)} />
    </>
  );
}
