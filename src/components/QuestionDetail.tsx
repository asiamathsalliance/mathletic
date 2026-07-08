"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/LatexText";
import { Check, ChevronLeft, Sparkles, X } from "lucide-react";
import type { Question } from "@/types/question";
import { AIHelpModal } from "@/components/AIHelpModal";
import { isQuestionSolved, markQuestionSolved } from "@/lib/progress";
import { checkAnswerWithLocalModel, type AnswerVerdict } from "@/lib/checkAnswer";
import { InlineAnswerFeedback } from "@/components/play/InlineAnswerFeedback";
import { AiUnavailableModal } from "@/components/AiUnavailableModal";
import { isAiUnavailableError } from "@/lib/aiErrors";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { CurriculumTag } from "@/components/ui/CurriculumTag";
import { cn } from "@/lib/utils";

interface QuestionDetailProps {
  question: Question;
  backHref?: string;
}

export function QuestionDetail({ question, backHref = "/" }: QuestionDetailProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [showAIHelp, setShowAIHelp] = useState(false);
  const [answerAnalysis, setAnswerAnalysis] = useState<string | null>(null);
  const [answerVerdict, setAnswerVerdict] = useState<AnswerVerdict | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [showAiUnavailable, setShowAiUnavailable] = useState(false);

  useEffect(() => {
    setIsSolved(isQuestionSolved(question.id));
    setSelectedChoice(null);
    setShowSolution(false);
    setStudentAnswer("");
    setAnswerVerdict(null);
    setAnswerAnalysis(null);
  }, [question.id]);

  const imagePath =
    question.image && question.image !== "none" ? question.image : question.questionImage;

  const isMultipleChoice =
    question.choices &&
    question.choices.length >= 4 &&
    typeof question.correctIndex === "number";

  const hasTried = isMultipleChoice ? selectedChoice !== null : studentAnswer.trim().length > 0;

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
              {question.year} · {question.examSource}
            </span>
            {isSolved && (
              <span className="text-xs font-medium text-[#24603D]">Solved</span>
            )}
            {isMultipleChoice && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setShowAIHelp(true)}
              >
                <Sparkles className="size-4 mr-1" />
                AI help
              </Button>
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

          <div className="text-base leading-relaxed">
            <LatexText block>{question.questionText}</LatexText>
          </div>
        </CardHeader>

        {isMultipleChoice && question.choices && (
          <CardContent className="border-t border-border pt-6">
            <div className="flex flex-col gap-2 mt-1">
              {question.choices.map((choice, index) => {
                const chosen = selectedChoice === index;
                const correct = index === question.correctIndex;
                const showCorrect = chosen && correct;
                const showWrong = chosen && !correct;
                const locked = selectedChoice === question.correctIndex;

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      setSelectedChoice(index);
                      if (!isSolved && index === question.correctIndex) {
                        markQuestionSolved(question);
                        setIsSolved(true);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-md border px-4 py-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      showCorrect && "border-l-4 border-l-[#2F7D4F] bg-[#2F7D4F]/10 border-border",
                      showWrong && "border-l-4 border-l-[#C94A3D] bg-[#C94A3D]/10 border-border",
                      !showCorrect && !showWrong && "border-border hover:bg-muted/50"
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 min-w-0 text-sm">
                      <LatexText>{choice}</LatexText>
                    </span>
                    {showCorrect && <Check className="size-4 text-[#24603D] shrink-0" />}
                    {showWrong && <X className="size-4 text-[#A03328] shrink-0" />}
                  </button>
                );
              })}
            </div>
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
                    markQuestionSolved(question);
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

        {showSolution && (
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
              <LatexText block>{question.solution}</LatexText>
            </div>
          </CardContent>
        )}

        {hasTried && (
          <CardFooter className="border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowSolution((s) => !s)}>
              {showSolution ? "Hide solution" : "Show solution"}
            </Button>
          </CardFooter>
        )}
      </Card>

      {isMultipleChoice && (
        <AIHelpModal
          open={showAIHelp}
          onClose={() => setShowAIHelp(false)}
          questionText={question.questionText}
          mode="stepHelp"
        />
      )}
      <AiUnavailableModal open={showAiUnavailable} onClose={() => setShowAiUnavailable(false)} />
    </>
  );
}
