"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { AuthMenu } from "@/components/auth/AuthMenu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Practice" },
  { href: "/sprint", label: "Sprint" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/browse", label: "Browse" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  return (
    <header className="app-header">
      <Link href="/" className="logo" onClick={scrollToTop}>
        <Image
          src="/mathletic-logo.png"
          alt=""
          width={32}
          height={32}
          className="logo-image"
          priority
        />
        Mathletic
      </Link>

      <nav className="nav-links" aria-label="Main">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            scroll={href === "/" ? false : undefined}
            onClick={href === "/" ? scrollToTop : undefined}
            className={cn("nav-link", isActive(href) && "nav-link-active")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="header-right">
        <SearchBar />
        <AuthMenu />
      </div>
    </header>
  );
}
