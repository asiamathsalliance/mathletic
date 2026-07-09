"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/types/question";
import { fetchQuestionsForDropdown, questionPreviewForDropdown } from "@/lib/searchDropdown";
import { Search } from "lucide-react";
import { LatexText } from "@/components/LatexText";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [matches, setMatches] = useState<Question[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch of dropdown matches from the API.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchQuestionsForDropdown(q, 8, controller.signal)
        .then(setMatches)
        .catch(() => {});
    }, 200);
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
    (question: Question) => {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(question.id)}&from=${encodeURIComponent("/play")}`);
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
    <div ref={rootRef} className="search-row relative flex-1 max-w-[400px] w-full">
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
          <Search
            className="size-[18px] -rotate-12"
            strokeWidth={2.25}
            aria-hidden
          />
        </button>
      </form>

      {open && query.trim() && (
        <ul
          id="search-dropdown"
          role="listbox"
          className="search-dropdown absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[320px] overflow-y-auto"
        >
          {matches.length === 0 ? (
            <li className="search-dropdown-empty px-4 py-3 text-sm font-bold text-[var(--ink-muted)]">
              No matching questions
            </li>
          ) : (
            matches.map((q, i) => (
              <li key={q.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  className={`search-dropdown-item w-full text-left px-4 py-3 transition-colors ${
                    i === activeIndex ? "search-dropdown-item-active" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => goToQuestion(q)}
                >
                  <div className="text-sm font-extrabold text-[var(--ink)] leading-snug line-clamp-2">
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
            <li className="border-t-[2px] border-[var(--ink)] px-4 py-2 bg-[var(--green-tint)]">
              <button
                type="button"
                className="text-xs font-extrabold text-[var(--ink)] underline"
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
