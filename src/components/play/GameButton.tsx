"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type GameButtonVariant = "primary" | "secondary" | "sage";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant;
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<GameButtonVariant, string> = {
  primary: "bg-[var(--ink)] text-[var(--cream)] border-[var(--ink)] game-shadow-primary game-press-primary",
  secondary: "bg-[var(--white)] text-[var(--ink)] border-[var(--ink)] game-shadow-secondary game-press-secondary",
  sage: "bg-[var(--green)] text-[var(--ink)] border-[var(--ink)] game-shadow-sage game-press-sage",
};

const sizeClasses = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-2xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
};

export function GameButton({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: GameButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center font-bold border-[3px] game-press transition-transform select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed font-[family-name:var(--font-heading)] cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
