"use client";

import { BackButton } from "@/components/BackButton";

interface PageHeadingProps {
  title: string;
  subtitle?: string;
  /** Optional smaller heading (e.g. search page uses text-2xl) */
  size?: "default" | "sm";
}

export function PageHeading({ title, subtitle, size = "default" }: PageHeadingProps) {
  return (
    <div className="flex items-start gap-2">
      <BackButton />
      <div className="min-w-0">
        <h1
          className={
            size === "sm"
              ? "text-2xl md:text-3xl font-bold text-foreground"
              : "text-3xl md:text-4xl font-bold text-foreground"
          }
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
