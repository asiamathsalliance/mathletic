"use client";

import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/play" className="logo">
        <span className="logo-mark" aria-hidden>
          Σ
        </span>
        Mathletic
      </Link>
      <nav className="hidden sm:block">
        <Link href="/browse">Browse</Link>
      </nav>
      <div className="header-right">
        <SearchBar />
        <Link href="/play/profile" className="avatar" title="Your badges and progress">
          P
        </Link>
      </div>
    </header>
  );
}
