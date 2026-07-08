"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexTextProps {
  /** Text with optional LaTeX: use $...$ for inline, $$...$$ for display math */
  children: string;
  className?: string;
  /** Render as block (paragraph) or inline */
  block?: boolean;
}

const KATEX_OPTS = { throwOnError: false };

function renderLatex(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex.trim(), {
      ...KATEX_OPTS,
      displayMode,
    });
  } catch {
    return null;
  }
}

/**
 * Renders text with LaTeX. Supports:
 * - $...$ and $$...$$ (inline and display; can span lines)
 * - \(...\) and \[...\] (inline and display)
 */
export function LatexText({ children, className = "", block = false }: LatexTextProps) {
  const parsed = useMemo(() => {
    const parts: { type: "text" | "inline" | "display"; content: string }[] = [];
    let remaining = children;

    while (remaining.length > 0) {
      // Display: $$...$$ or \[...\]
      const displayDouble = remaining.match(/^\$\$([\s\S]*?)\$\$/);
      const displayBracket = remaining.match(/^\\\[\s*([\s\S]*?)\s*\\\]/);
      const displayMatch = displayDouble ?? displayBracket;
      const displayContent = displayMatch ? displayMatch[1] : null;

      if (displayContent !== null && displayMatch) {
        const html = renderLatex(displayContent, true);
        if (html) {
          parts.push({ type: "display", content: html });
        } else {
          parts.push({ type: "text", content: displayMatch[0] });
        }
        remaining = remaining.slice(displayMatch[0].length);
        continue;
      }

      // Inline: $...$ (non-greedy, may span lines; \$ inside math is not a
      // delimiter) or \(...\)
      const inlineDollar = remaining.match(/^\$((?:\\.|[^$\\])*?)\$/);
      const inlineParen = remaining.match(/^\\\(\s*([\s\S]*?)\s*\\\)/);
      const inlineMatch = inlineDollar ?? inlineParen;
      const inlineContent = inlineMatch ? inlineMatch[1] : null;

      if (inlineContent !== null && inlineMatch) {
        const html = renderLatex(inlineContent, false);
        if (html) {
          parts.push({ type: "inline", content: html });
        } else {
          parts.push({ type: "text", content: inlineMatch[0] });
        }
        remaining = remaining.slice(inlineMatch[0].length);
        continue;
      }

      // No math at current position: advance to next $ or \( or \[ or end
      const candidates = [
        remaining.indexOf("$"),
        remaining.indexOf("\\("),
        remaining.indexOf("\\["),
      ].filter((i) => i >= 0);
      const next = candidates.length > 0 ? Math.min(...candidates) : -1;

      if (next === -1) {
        parts.push({ type: "text", content: remaining });
        break;
      }
      if (next === 0) {
        // Unmatched delimiter at the current position (e.g. a lone "$"):
        // emit it as text and advance one char to guarantee progress.
        parts.push({ type: "text", content: remaining[0] });
        remaining = remaining.slice(1);
        continue;
      }
      parts.push({ type: "text", content: remaining.slice(0, next) });
      remaining = remaining.slice(next);
    }

    return parts;
  }, [children]);

  const Wrapper = block ? "div" : "span";

  return (
    <Wrapper className={className}>
      {parsed.map((part, i) => {
        if (part.type === "text") {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {part.content}
            </span>
          );
        }
        if (part.type === "display") {
          return (
            <div
              key={i}
              className="my-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          );
        }
        return (
          <span
            key={i}
            className="katex-inline"
            dangerouslySetInnerHTML={{ __html: part.content }}
          />
        );
      })}
    </Wrapper>
  );
}
