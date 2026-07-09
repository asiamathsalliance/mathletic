"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "loading" | "success" | "error";

interface SaveButtonProps {
  onSave: () => Promise<boolean>;
  className?: string;
}

export function SaveButton({ onSave, className }: SaveButtonProps) {
  const [state, setState] = useState<SaveState>("idle");
  const [pressed, setPressed] = useState(false);
  const [checkDrawn, setCheckDrawn] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, []);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  useEffect(() => {
    if (state === "success") {
      const t = requestAnimationFrame(() => setCheckDrawn(true));
      return () => cancelAnimationFrame(t);
    }
    setCheckDrawn(false);
  }, [state]);

  const busy = state !== "idle";

  async function handleClick() {
    if (busy) return;
    setState("loading");
    try {
      const ok = await onSave();
      if (ok) {
        setState("success");
        clearResetTimer();
        resetTimer.current = setTimeout(() => setState("idle"), 1200);
      } else {
        setState("error");
        clearResetTimer();
        resetTimer.current = setTimeout(() => setState("idle"), 1400);
      }
    } catch {
      setState("error");
      clearResetTimer();
      resetTimer.current = setTimeout(() => setState("idle"), 1400);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={state === "loading"}
      onClick={() => void handleClick()}
      onPointerDown={() => !busy && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className={cn(
        "btn-primary save-btn mt-4",
        state === "success" && "bg-[#2F7D4F]",
        state === "loading" && "save-btn--busy",
        pressed && !busy && "save-btn--pressed",
        state === "success" && "save-btn--pulse",
        state === "error" && "save-btn--shake",
        className
      )}
    >
      <span className="save-btn__track" aria-live="polite">
        <span
          className={cn("save-btn__state", state === "idle" && "save-btn__state--active")}
          aria-hidden={state !== "idle"}
        >
          Save Changes
        </span>
        <span
          className={cn("save-btn__state", state === "loading" && "save-btn__state--active")}
          aria-hidden={state !== "loading"}
        >
          <Loader2 className="save-btn__spinner" aria-hidden />
          Saving...
        </span>
        <span
          className={cn("save-btn__state", state === "success" && "save-btn__state--active")}
          aria-hidden={state !== "success"}
        >
          <svg
            className="save-btn__check"
            viewBox="0 0 16 16"
            width={14}
            height={14}
            aria-hidden
          >
            <path
              d="M3.5 8.25 6.5 11.25 12.5 4.75"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className={cn("save-btn__check-path", checkDrawn && "save-btn__check-path--drawn")}
            />
          </svg>
          Saved
        </span>
        <span
          className={cn("save-btn__state", state === "error" && "save-btn__state--active")}
          aria-hidden={state !== "error"}
        >
          <AlertCircle className="save-btn__error-icon" aria-hidden />
          Couldn&apos;t save
        </span>
      </span>
    </button>
  );
}
