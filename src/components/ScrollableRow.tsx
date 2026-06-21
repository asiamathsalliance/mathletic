"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface ScrollableRowProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontal scroll container with fade gradients on left/right edges
 * when content overflows. Fades appear based on scroll position.
 */
export function ScrollableRow({ children, className = "" }: ScrollableRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftFade(scrollLeft > 8);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFades();
    el.addEventListener("scroll", updateFades);
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFades);
      ro.disconnect();
    };
  }, [updateFades]);

  return (
    <div className={`relative ${className}`}>
      {showLeftFade && (
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-background to-transparent"
          aria-hidden
        />
      )}
      {showRightFade && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
          aria-hidden
        />
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-2 scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarGutter: "stable" }}
      >
        {children}
      </div>
    </div>
  );
}
