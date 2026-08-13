import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Clean LeetCode-style legal document shell:
 * one white card, simple headings, no side menu / colored callouts.
 */
export function LegalShell({
  title,
  subtitle,
  updated,
  children,
  otherHref,
  otherLabel,
}: {
  title: string;
  /** One-line purpose so Privacy vs Terms stay visually distinct. */
  subtitle: string;
  updated: string;
  children: ReactNode;
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl pb-16">
      <article className="rounded-xl border border-border bg-card px-6 py-8 shadow-[0_1px_3px_rgba(34,52,26,0.05),0_8px_24px_rgba(34,52,26,0.04)] sm:px-10 sm:py-12">
        <header className="border-b border-border pb-6">
          <h1 className="text-page-title ![font-size:1.75rem] uppercase tracking-wide sm:![font-size:2rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <p className="mt-3 text-xs text-muted-foreground">Last updated: {updated}</p>
        </header>

        <div className="divide-y divide-border">{children}</div>

        <footer className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
          Related:{" "}
          <Link
            href={otherHref}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {otherLabel}
          </Link>
        </footer>
      </article>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-6 first:pt-8 last:pb-0">
      <h2 className="text-section-header mb-3 ![font-size:1.25rem] uppercase tracking-wide sm:![font-size:1.35rem]">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/85 sm:text-[15px] [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-2 hover:[&_a]:underline">
        {children}
      </div>
    </section>
  );
}
