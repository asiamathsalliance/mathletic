"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/challenge", label: "Play" },
  { href: "/browse", label: "Browse" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="app-header">
      <Link href="/" className="logo">
        <span className="logo-mark" aria-hidden>
          Σ
        </span>
        Mathletic
      </Link>

      <nav className="nav-links" aria-label="Main">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn("nav-link", isActive(href) && "nav-link-active")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="header-right">
        <SearchBar />
        <Link
          href="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground hover:bg-accent"
          title="Progress dashboard"
        >
          P
        </Link>
      </div>
    </header>
  );
}
