"use client";

import { GameButton } from "@/components/play/GameButton";

interface AiUnavailableModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiUnavailableModal({ open, onClose }: AiUnavailableModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-unavailable-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border-[3px] border-[var(--ink)] bg-[var(--cream)] p-6 shadow-[6px_6px_0_var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="ai-unavailable-title"
          className="text-xl font-bold text-[var(--ink)] font-[family-name:var(--font-heading)]"
        >
          AI checking unavailable
        </h2>
        <p className="mt-3 text-sm font-semibold text-[var(--ink-muted)] leading-relaxed">
          This feature isn&apos;t available right now. To use answer checking, start Ollama locally
          and pull a model (e.g.{" "}
          <code className="text-xs bg-[var(--white)] px-1 py-0.5 rounded">llama3.2:1b</code>
          ), or add a valid API key with available credit.
        </p>
        <div className="mt-6 flex justify-end">
          <GameButton variant="secondary" onClick={onClose}>
            OK
          </GameButton>
        </div>
      </div>
    </div>
  );
}
