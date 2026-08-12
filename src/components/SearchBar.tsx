"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  fetchQuestionsForDropdown,
  questionPreviewForDropdown,
  type SearchDropdownHit,
} from "@/lib/searchDropdown";
import { Search } from "lucide-react";
import { LatexText } from "@/components/LatexText";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [matches, setMatches] = useState<SearchDropdownHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestQuery = useRef("");

  // Debounced fetch — summaries API is cheap; keep debounce short for snappy feel.
  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    if (!q) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchQuestionsForDropdown(q, 6, controller.signal)
        .then((hits) => {
          if (latestQuery.current !== q) return;
          startTransition(() => {
            setMatches(hits);
            setLoading(false);
          });
        })
        .catch(() => {
          if (latestQuery.current === q) setLoading(false);
        });
    }, 120);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goToQuestion = useCallback(
    (question: SearchDropdownHit) => {
      setOpen(false);
      setQuery("");
      setMatches([]);
      // Return to the page the user was on when they used the search bar —
      // not the search-results list (that only applies when opening from /search results).
      const path = window.location.pathname;
      const search = window.location.search;
      const current = `${path}${search}` || "/";
      const from = path.startsWith("/questions/") ? "/" : current;
      router.push(`/questions/${question.id}?from=${encodeURIComponent(from)}`);
    },
    [router]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      if (activeIndex >= 0 && matches[activeIndex]) {
        goToQuestion(matches[activeIndex]);
        return;
      }
      // Single exact dropdown hit → open question directly
      if (matches.length === 1) {
        goToQuestion(matches[0]);
        return;
      }
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [query, activeIndex, matches, goToQuestion, router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="search-row relative w-full max-w-[400px] flex-1">
      <form onSubmit={handleSubmit} className="search-field w-full">
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Search questions…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search exam questions"
          aria-expanded={open && matches.length > 0}
          aria-controls="search-dropdown"
          autoComplete="off"
        />
        <button type="submit" className="search-btn" aria-label="Search">
          <Search className="size-[18px] -rotate-12" strokeWidth={2.25} aria-hidden />
        </button>
      </form>

      {open && query.trim() && (
        <ul
          id="search-dropdown"
          role="listbox"
          className="search-dropdown absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[320px] overflow-y-auto"
        >
          {loading && matches.length === 0 ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="animate-pulse px-4 py-3" aria-hidden={i > 0}>
                  <div className="h-4 w-[88%] rounded bg-[var(--ink-muted)]/20" />
                  <div className="mt-2 h-3 w-40 max-w-full rounded bg-[var(--ink-muted)]/15" />
                  {i === 0 ? <span className="sr-only">Searching…</span> : null}
                </li>
              ))}
            </>
          ) : matches.length === 0 ? (
            <li className="search-dropdown-empty px-4 py-3 text-sm font-bold text-[var(--ink-muted)]">
              No matching questions
            </li>
          ) : (
            matches.map((q, i) => (
              <li key={q.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  className={`search-dropdown-item w-full px-4 py-3 text-left transition-colors ${
                    i === activeIndex ? "search-dropdown-item-active" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => goToQuestion(q)}
                >
                  <div className="line-clamp-2 text-sm font-extrabold leading-snug text-[var(--ink)]">
                    <LatexText>{questionPreviewForDropdown(q.questionText)}</LatexText>
                  </div>
                  <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                    {q.curriculum} · {q.topic} · {q.difficulty}
                  </span>
                </button>
              </li>
            ))
          )}
          {matches.length > 0 && (
            <li className="border-t-[2px] border-[var(--ink)] bg-[var(--green-tint)] px-4 py-2">
              <button
                type="button"
                className="cursor-pointer text-xs font-extrabold text-[var(--ink)] underline"
                onClick={() => {
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }}
              >
                See all results for &ldquo;{query.trim()}&rdquo;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
