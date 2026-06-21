 "use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/LatexText";
import { AiUnavailableModal } from "@/components/AiUnavailableModal";
import { isAiUnavailableError } from "@/lib/aiErrors";

interface AIHelpModalProps {
  open: boolean;
  onClose: () => void;
  questionText: string;
  /** Optional typed answer text for long-answer questions. */
  studentAnswer?: string;
  /** Mode: generic step help vs explicit answer checking. */
  mode?: "stepHelp" | "answerCheck";
}

interface AIAnalysisSections {
  raw: string;
  stepAnalysis?: string;
  mistake?: string;
  explanation?: string;
  nextStep?: string;
}

function parseAnalysis(raw: string): AIAnalysisSections {
  const result: AIAnalysisSections = { raw };
  const lines = raw.split(/\r?\n/);
  let current: keyof AIAnalysisSections | null = null;

  const pushLine = (key: keyof AIAnalysisSections, line: string) => {
    if (!result[key]) result[key] = line;
    else result[key] = (result[key] as string) + "\n" + line;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^step analysis\s*:/i.test(trimmed)) {
      current = "stepAnalysis";
      continue;
    }
    if (/^mistake( \(if any\))?\s*:/i.test(trimmed)) {
      current = "mistake";
      continue;
    }
    if (/^explanation\s*:/i.test(trimmed)) {
      current = "explanation";
      continue;
    }
    if (/^next step\s*:/i.test(trimmed)) {
      current = "nextStep";
      continue;
    }
    if (current) {
      pushLine(current, line);
    }
  }

  return result;
}

export function AIHelpModal({
  open,
  onClose,
  questionText,
  studentAnswer,
  mode = "stepHelp",
}: AIHelpModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisSections | null>(null);
  const [showAiUnavailable, setShowAiUnavailable] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreviewUrl(null);
      setIsLoading(false);
      setError(null);
      setAnalysis(null);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) return null;

  const handleFile = (f: File | null) => {
    if (!f) return;
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(f.type)) {
      setError("Please upload a PNG or JPG image.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setError(null);
    setAnalysis(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const combinedQuestion =
        mode === "answerCheck" && studentAnswer && studentAnswer.trim().length > 0
          ? `${questionText}\n\nStudent's typed answer:\n${studentAnswer}`
          : questionText;

      const formData = new FormData();
      formData.append("questionText", combinedQuestion);
      formData.append("file", file);
      const res = await fetch("/api/analyze-solution", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Failed to analyze solution.");
      }
      const data = (await res.json()) as { analysis: string };
      setAnalysis(parseAnalysis(data.analysis ?? ""));
    } catch (err) {
      if (isAiUnavailableError(err)) {
        setShowAiUnavailable(true);
        setError(null);
      } else {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xl rounded-xl bg-background shadow-lg border border-border p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              AI Step Help
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Upload a photo of your handwritten work to get guided feedback.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm"
            aria-label="Close AI help"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Question</p>
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-2 max-h-24 overflow-y-auto text-xs sm:text-sm text-foreground">
            <LatexText block>{questionText}</LatexText>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Upload your work</p>
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/60 transition-colors"
            onClick={handleUploadClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <p className="text-xs sm:text-sm text-muted-foreground">
              Drag and drop an image here, or <span className="font-medium text-primary">click to upload</span>
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Accepted formats: PNG, JPG, JPEG
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {previewUrl && (
            <div className="mt-2 flex items-center gap-3">
              <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview of uploaded work"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground break-all">
                {file?.name}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-500/50 bg-red-500/5 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFile(null);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              setAnalysis(null);
              setError(null);
            }}
            disabled={!file && !analysis}
          >
            Clear
          </Button>
          <div className="flex items-center gap-3">
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Analyzing...</span>
              </div>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!file || isLoading}
            >
              Submit to AI
            </Button>
          </div>
        </div>

        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 space-y-3 text-sm">
          {analysis ? (
            <>
              {analysis.stepAnalysis && (
                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Step Analysis
                  </h3>
                  <div className="mt-1 text-foreground text-sm">
                    <LatexText block>{analysis.stepAnalysis.trim()}</LatexText>
                  </div>
                </section>
              )}
              {analysis.mistake && (
                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Mistake
                  </h3>
                  <div className="mt-1 text-foreground text-sm">
                    <LatexText block>{analysis.mistake.trim()}</LatexText>
                  </div>
                </section>
              )}
              {analysis.explanation && (
                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Explanation
                  </h3>
                  <div className="mt-1 text-foreground text-sm">
                    <LatexText block>{analysis.explanation.trim()}</LatexText>
                  </div>
                </section>
              )}
              {analysis.nextStep && (
                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Next Step
                  </h3>
                  <div className="mt-1 text-foreground text-sm">
                    <LatexText block>{analysis.nextStep.trim()}</LatexText>
                  </div>
                </section>
              )}
              {!analysis.stepAnalysis &&
                !analysis.mistake &&
                !analysis.explanation &&
                !analysis.nextStep && (
                  <div className="text-foreground text-sm">
                    <LatexText block>{analysis.raw}</LatexText>
                  </div>
                )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              AI feedback will appear here after you submit your work.
            </p>
          )}
        </div>
      </div>
    </div>
    <AiUnavailableModal
      open={showAiUnavailable}
      onClose={() => setShowAiUnavailable(false)}
    />
    </>
  );
}

