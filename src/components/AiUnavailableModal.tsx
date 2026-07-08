"use client";

import { Button } from "@/components/ui/button";

interface AiUnavailableModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiUnavailableModal({ open, onClose }: AiUnavailableModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-unavailable-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ai-unavailable-title" className="text-section-header">
          AI checking unavailable
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          This feature isn&apos;t available right now. To use answer checking, start Ollama locally
          and pull a model (e.g.{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">llama3.2:1b</code>
          ), or add a valid API key with available credit.
        </p>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
