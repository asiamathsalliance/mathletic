"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/LatexText";
import { Check, Sparkles, X } from "lucide-react";
import type { Question } from "@/types/question";
import { AIHelpModal } from "@/components/AIHelpModal";
import { isQuestionSolved, markQuestionSolved } from "@/lib/progress";
import { checkAnswerWithLocalModel, type AnswerVerdict } from "@/lib/checkAnswer";
import { InlineAnswerFeedback } from "@/components/play/InlineAnswerFeedback";
import { AiUnavailableModal } from "@/components/AiUnavailableModal";
import { isAiUnavailableError } from "@/lib/aiErrors";

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
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
  }, [question.id]);

  const imagePath =
    question.image && question.image !== "none"
      ? question.image
      : question.questionImage;

  const hasQuestionImage = Boolean(imagePath);
  const hasSolutionImage = Boolean(question.solutionImage);

  const isMultipleChoice =
    question.choices &&
    question.choices.length >= 4 &&
    typeof question.correctIndex === "number";

  const hasTried = isMultipleChoice ? selectedChoice !== null : true;

  const handleCheckAnswer = async () => {
    if (!studentAnswer.trim()) {
      setAnswerError("Please enter your answer before checking.");
      setAnswerAnalysis(null);
      setAnswerVerdict(null);
      return;
    }
    setAnswerError(null);
    setIsCheckingAnswer(true);
    setAnswerAnalysis(null);
    setAnswerVerdict(null);
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
        setAnswerError(null);
      } else {
        const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
        setAnswerError(message);
      }
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
              <span className="font-medium text-foreground">{question.curriculum}</span>
              <span>·</span>
              <span>{question.year}</span>
              <span>·</span>
              <span>{question.examSource}</span>
              <span>·</span>
              <span
                className={
                  question.difficulty === "Hard"
                    ? "text-red-600"
                    : question.difficulty === "Medium"
                      ? "text-amber-600"
                      : "text-green-600"
                }
              >
                {question.difficulty}
              </span>
              {isSolved && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Solved
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => isMultipleChoice && setShowAIHelp(true)}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors ${!isMultipleChoice ? "invisible" : ""}`}
              aria-label="Open AI step help"
              tabIndex={isMultipleChoice ? 0 : -1}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>
        {hasQuestionImage && (
          <div className="relative w-full min-h-[200px] rounded-lg border border-border overflow-hidden bg-muted/30">
            <Image
              src={imagePath!}
              alt="Question"
              fill
              className="object-contain object-left-top p-2"
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized={imagePath!.startsWith("http")}
            />
          </div>
        )}
          {question.questionText && (
            <div className="text-base md:text-lg leading-relaxed">
              <LatexText block>{question.questionText}</LatexText>
            </div>
          )}
          {!isMultipleChoice && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Your answer
                </label>
                <textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Write your reasoning or final answer here..."
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isCheckingAnswer && (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span>Checking answer with AI...</span>
                    </>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCheckAnswer}
                  disabled={isCheckingAnswer}
                >
                  {isCheckingAnswer ? "Checking..." : "Check answer"}
                </Button>
                {!isSolved && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!isSolved) {
                        markQuestionSolved(question);
                        setIsSolved(true);
                      }
                    }}
                  >
                    Mark as completed
                  </Button>
                )}
              </div>
              {answerError && (
                <p className="text-xs text-red-600">{answerError}</p>
              )}
              {answerVerdict && (
                <InlineAnswerFeedback
                  verdict={answerVerdict}
                  analysis={answerAnalysis || "Answer checked."}
                />
              )}
            </div>
          )}
        </CardHeader>
        {isMultipleChoice && question.choices && (
          <CardContent className="play-mcq-section mt-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {question.choices.map((choice, index) => {
              const chosen = selectedChoice === index;
              const correct = index === question.correctIndex;
              const showCorrectStyle = chosen && correct;
              const chosenIncorrect = chosen && !correct;
              const answeredCorrect = selectedChoice === question.correctIndex;
              const disabled = answeredCorrect;

              const baseClasses =
                "relative rounded-lg border-2 p-4 text-left transition-all focus-visible:outline-none flex items-center gap-3 min-h-[3rem]";

              const stateClasses = showCorrectStyle
                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                : chosenIncorrect
                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                  : "border-border bg-card" + (answeredCorrect ? "" : " hover:bg-muted/50");

              return (
                <button
                  key={index}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setSelectedChoice(index);
                    if (!isSolved && index === question.correctIndex) {
                      markQuestionSolved(question);
                      setIsSolved(true);
                    }
                  }}
                  className={`${baseClasses} ${stateClasses} ${disabled ? "cursor-default" : ""}`}
                >
                  <span className="font-medium text-muted-foreground shrink-0">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="text-sm md:text-base flex-1 min-w-0 text-left">
                    <LatexText>{choice}</LatexText>
                  </span>
                  {showCorrectStyle && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  {chosenIncorrect && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                      <X className="h-4 w-4" />
                    </span>
                  )}
                </button>
              );
            })}
            </div>
          </CardContent>
        )}
        <CardContent className={isMultipleChoice ? "pt-0" : "pt-0"}>
          {showSolution && (
          <div className="rounded-lg bg-muted/60 p-4 border border-border space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Solution
            </p>
            {hasSolutionImage && (
              <div className="relative w-full min-h-[200px] rounded border border-border overflow-hidden bg-background">
                <Image
                  src={question.solutionImage!}
                  alt="Solution"
                  fill
                  className="object-contain object-left-top p-2"
                  sizes="(max-width: 768px) 100vw, 800px"
                  unoptimized={question.solutionImage!.startsWith("http")}
                />
              </div>
            )}
            {question.solution && (
              <div className="text-sm leading-relaxed">
                <LatexText block>{question.solution}</LatexText>
              </div>
            )}
          </div>
        )}
        </CardContent>
        {hasTried && (
          <CardFooter className="min-h-[3.5rem] flex items-center justify-start py-4">
            <Button
              variant={showSolution ? "secondary" : "default"}
              onClick={() => setShowSolution((s) => !s)}
              className="hover:opacity-90 hover:scale-[1.02] transition-all"
            >
              {showSolution ? "Hide Solution" : "Show Solution"}
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
      <AiUnavailableModal
        open={showAiUnavailable}
        onClose={() => setShowAiUnavailable(false)}
      />
    </>
  );
}
