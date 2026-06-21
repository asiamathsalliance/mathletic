"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/LatexText";
import { addSavedDashboardItem } from "@/lib/dashboardSaved";
import { AiUnavailableModal } from "@/components/AiUnavailableModal";
import { isAiUnavailableError } from "@/lib/aiErrors";

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
    if (current) pushLine(current, line);
  }
  return result;
}

export interface AddQuestionModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after user saves to dashboard so dashboard can refresh. */
  onSaved?: () => void;
}

export function AddQuestionModal({ open, onClose, onSaved }: AddQuestionModalProps) {
  const [inputMode, setInputMode] = useState<"typed" | "image">("typed");
  const [typedText, setTypedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisRaw, setAnalysisRaw] = useState<string | null>(null);
  const [showAiUnavailable, setShowAiUnavailable] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setTypedText("");
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setIsLoading(false);
      setError(null);
      setAnalysisRaw(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(f.type)) {
      setError("Please upload a PNG or JPG image.");
      return;
    }
    setError(null);
    setAnalysisRaw(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleAnalyze = async () => {
    const hasText = typedText.trim().length > 0;
    const hasImage = file != null;
    if (!hasText && !hasImage) {
      setError("Type a question/answer or upload an image.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisRaw(null);
    try {
      const formData = new FormData();
      formData.append("questionText", hasText ? typedText.trim() : "Please analyze the handwritten work in the attached image.");
      if (hasImage && file) formData.append("file", file);
      const res = await fetch(
        hasImage ? "/api/analyze-solution" : "/api/analyze-solution?stream=1",
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Analysis failed.");
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t) continue;
            try {
              const data = JSON.parse(t) as { delta?: string; error?: string };
              if (data.error) throw new Error(data.error);
              if (data.delta) {
                accumulated += data.delta;
                setAnalysisRaw(accumulated);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              if (e instanceof Error) throw e;
            }
          }
        }
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim()) as { delta?: string; error?: string };
            if (data.error) throw new Error(data.error);
            if (data.delta) {
              accumulated += data.delta;
              setAnalysisRaw(accumulated);
            }
          } catch (e) {
            if (e instanceof SyntaxError) return;
            if (e instanceof Error) throw e;
          }
        }
      } else {
        const data = (await res.json()) as { analysis: string };
        setAnalysisRaw(data.analysis ?? "");
      }
    } catch (err) {
      if (isAiUnavailableError(err)) {
        setShowAiUnavailable(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!analysisRaw) return;
    if (inputMode === "image" && file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = (reader.result as string) ?? "";
        addSavedDashboardItem({
          type: "image",
          content: dataUrl,
          analysis: analysisRaw,
        });
        window.dispatchEvent(new CustomEvent("dashboard-saved"));
        onSaved?.();
        onClose();
      };
      reader.readAsDataURL(file);
      return;
    }
    const content =
      inputMode === "typed"
        ? typedText.trim() || "(No text entered)"
        : "";
    addSavedDashboardItem({
      type: inputMode,
      content,
      analysis: analysisRaw,
    });
    window.dispatchEvent(new CustomEvent("dashboard-saved"));
    onSaved?.();
    onClose();
  };

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  const analysis = analysisRaw ? parseAnalysis(analysisRaw) : null;
  const showResult = analysisRaw != null;

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xl rounded-xl bg-background border border-border shadow-lg p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-2 shrink-0">
          <h2 className="text-lg font-semibold text-foreground">
            {showResult ? "AI analysis" : "Add question"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!showResult ? (
          <>
            <div className="flex gap-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setInputMode("typed")}
                className={`px-3 py-1.5 text-sm rounded-md ${inputMode === "typed" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}
              >
                Type
              </button>
              <button
                type="button"
                onClick={() => setInputMode("image")}
                className={`px-3 py-1.5 text-sm rounded-md ${inputMode === "image" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}
              >
                Upload image
              </button>
            </div>

            {inputMode === "typed" ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Question or answer to analyze
                </label>
                <textarea
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Paste or type your question or solution..."
                  className="w-full min-h-[120px] rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y"
                  rows={4}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Upload handwritten work or question
                </label>
                <div
                  onClick={() => inputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-6 cursor-pointer hover:border-primary/60"
                >
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop (PNG, JPG)
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
                  <div className="flex items-center gap-3">
                    <div className="h-20 w-20 rounded-md border border-border overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm text-muted-foreground">{file?.name}</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-500/5 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleAnalyze} disabled={isLoading}>
                {isLoading ? "Analyzing…" : "Analyze with AI"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground shrink-0">AI solution</p>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 overflow-y-auto max-h-[50vh] space-y-3 text-sm shrink min-h-0">
              {analysis && (
                <>
                  {analysis.stepAnalysis && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                        Step Analysis
                      </h3>
                      <div className="mt-1 text-foreground">
                        <LatexText block>{analysis.stepAnalysis.trim()}</LatexText>
                      </div>
                    </section>
                  )}
                  {analysis.mistake && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                        Mistake
                      </h3>
                      <div className="mt-1 text-foreground">
                        <LatexText block>{analysis.mistake.trim()}</LatexText>
                      </div>
                    </section>
                  )}
                  {analysis.explanation && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                        Explanation
                      </h3>
                      <div className="mt-1 text-foreground">
                        <LatexText block>{analysis.explanation.trim()}</LatexText>
                      </div>
                    </section>
                  )}
                  {analysis.nextStep && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                        Next Step
                      </h3>
                      <div className="mt-1 text-foreground">
                        <LatexText block>{analysis.nextStep.trim()}</LatexText>
                      </div>
                    </section>
                  )}
                  {!analysis.stepAnalysis &&
                    !analysis.mistake &&
                    !analysis.explanation &&
                    !analysis.nextStep && (
                      <div className="text-foreground">
                        <LatexText block>{analysis.raw}</LatexText>
                      </div>
                    )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 shrink-0 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Disregard
              </Button>
              <Button onClick={handleSave}>Save to dashboard</Button>
            </div>
          </>
        )}
      </div>
    </div>
    <AiUnavailableModal
      open={showAiUnavailable}
      onClose={() => setShowAiUnavailable(false)}
    />
    </>
  );
}
