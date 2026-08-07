"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Only allow same-origin relative paths (blocks open redirects). */
function safeInternalPath(from: string | null): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return null;
  return from;
}

function BackButtonInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = safeInternalPath(searchParams.get("from"));

  if (pathname === "/") return null;

  if (from) {
    const label = from.startsWith("/browse")
      ? "Back to browse"
      : from.startsWith("/search")
        ? "Back to search results"
        : "Go back";
    return (
      <Link
        href={from}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label={label}
      >
        <ArrowLeft className="size-5" />
      </Link>
    );
  }

  if (pathname.startsWith("/olympiad") || pathname.startsWith("/amc/")) {
    return (
      <Link
        href="/browse"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Back to browse"
      >
        <ArrowLeft className="size-5" />
      </Link>
    );
  }

  // Curriculum topic pages: /hsc/advanced/calculus → browse (primary entry), not /hsc.
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    ["hsc", "ib", "ap", "a-level"].includes(segments[0])
  ) {
    return (
      <Link
        href="/browse"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Back to browse"
      >
        <ArrowLeft className="size-5" />
      </Link>
    );
  }

  const backHref = segments.length >= 2 ? `/${segments[0]}` : "/";

  return (
    <Link
      href={backHref}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      aria-label="Go back to previous page"
    >
      <ArrowLeft className="size-5" />
    </Link>
  );
}

export function BackButton() {
  return (
    <Suspense fallback={<span className="inline-block size-8 shrink-0" aria-hidden />}>
      <BackButtonInner />
    </Suspense>
  );
}
