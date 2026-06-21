"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function BackButtonInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  if (pathname === "/") return null;

  if (from && from.startsWith("/search")) {
    return (
      <Link
        href={from}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Back to search results"
      >
        <ArrowLeft className="size-5" />
      </Link>
    );
  }

  if (pathname.startsWith("/olympiad")) {
    return (
      <Link
        href="/"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Go back to main page"
      >
        <ArrowLeft className="size-5" />
      </Link>
    );
  }

  const segments = pathname.split("/").filter(Boolean);
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
