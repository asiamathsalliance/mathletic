"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { normalizeLatexContent } from "@/lib/latexNormalize";

interface LatexTextProps {
  /** Text with optional LaTeX: use $...$ for inline, $$...$$ for display math */
  children: string;
  className?: string;
  /** Render as block (paragraph) or inline */
  block?: boolean;
  /** Skip normalizeLatexContent (already cleaned). */
  raw?: boolean;
  /**
   * Force a single visual line (problem-bank previews).
   * Collapses newlines and renders display math inline.
   */
  singleLine?: boolean;
}

const KATEX_OPTS = {
  throwOnError: false,
  trust: false,
  strict: "ignore" as const,
};

function renderLatex(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex.trim(), {
      ...KATEX_OPTS,
      displayMode,
      // Common contest macros
      macros: {
        "\\dfrac": "\\frac",
        "\\tfrac": "\\frac",
      },
    });
  } catch {
    return null;
  }
}

/**
 * Renders text with LaTeX. Supports:
 * - $...$ and $$...$$ (inline and display; can span lines)
 * - \(...\) and \[...\] (inline and display)
 * - Bare \begin{align*}...\end{align*} (auto-promoted to display)
 */
export function LatexText({
  children,
  className = "",
  block = false,
  raw = false,
  singleLine = false,
}: LatexTextProps) {
  const parsed = useMemo(() => {
    let source = raw ? String(children ?? "") : normalizeLatexContent(children);
    if (singleLine) {
      // Collapse to one line for table/list previews.
      source = source.replace(/\s+/g, " ").trim();
    }
    const parts: { type: "text" | "inline" | "display"; content: string }[] = [];
    let remaining = source;

    while (remaining.length > 0) {
      // Display: $$...$$ or \[...\]
      const displayDouble = remaining.match(/^\$\$([\s\S]*?)\$\$/);
      const displayBracket = remaining.match(/^\\\[\s*([\s\S]*?)\s*\\\]/);
      const displayMatch = displayDouble ?? displayBracket;
      const displayContent = displayMatch ? displayMatch[1] : null;

      if (displayContent !== null && displayMatch) {
        // In single-line previews, force inline so the row never wraps.
        const html = renderLatex(displayContent, singleLine ? false : true);
        if (html) {
          parts.push({ type: singleLine ? "inline" : "display", content: html });
        } else {
          parts.push({ type: "text", content: displayMatch[0] });
        }
        remaining = remaining.slice(displayMatch[0].length);
        continue;
      }

      // Bare display environments (AoPS solutions often omit $$)
      const envMatch = remaining.match(
        /^(\\begin\{(?:align|equation|gather|multline|eqnarray)\*?\}[\s\S]*?\\end\{(?:align|equation|gather|multline|eqnarray)\*?\})/
      );
      if (envMatch) {
        const html = renderLatex(envMatch[1], singleLine ? false : true);
        if (html) {
          parts.push({ type: singleLine ? "inline" : "display", content: html });
        } else {
          parts.push({ type: "text", content: envMatch[0] });
        }
        remaining = remaining.slice(envMatch[0].length);
        continue;
      }

      // Bare \boxed{...} (AoPS often omits surrounding $)
      if (remaining.startsWith("\\boxed{")) {
        const openAt = "\\boxed".length;
        // balanced extract inline
        let depth = 0;
        let k = openAt;
        let end = -1;
        while (k < remaining.length) {
          if (remaining[k] === "\\") {
            k += 2;
            continue;
          }
          if (remaining[k] === "{") depth += 1;
          else if (remaining[k] === "}") {
            depth -= 1;
            if (depth === 0) {
              end = k + 1;
              break;
            }
          }
          k += 1;
        }
        if (end > 0) {
          const block = remaining.slice(0, end);
          const html = renderLatex(block, false);
          if (html) {
            parts.push({ type: "inline", content: html });
            remaining = remaining.slice(end);
            continue;
          }
        }
      }

      // Inline: $...$ or \(...\)
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

      const candidates = [
        remaining.indexOf("$"),
        remaining.indexOf("\\("),
        remaining.indexOf("\\["),
        remaining.indexOf("\\boxed{"),
        remaining.search(/\\begin\{(?:align|equation|gather|multline|eqnarray)\*?\}/),
      ].filter((i) => i >= 0);
      const next = candidates.length > 0 ? Math.min(...candidates) : -1;

      if (next === -1) {
        parts.push({ type: "text", content: remaining });
        break;
      }
      if (next === 0) {
        parts.push({ type: "text", content: remaining[0] });
        remaining = remaining.slice(1);
        continue;
      }
      parts.push({ type: "text", content: remaining.slice(0, next) });
      remaining = remaining.slice(next);
    }

    return parts;
  }, [children, raw, singleLine]);

  const Wrapper = block && !singleLine ? "div" : "span";

  return (
    <Wrapper className={className}>
      {parsed.map((part, i) => {
        if (part.type === "text") {
          const chunks = part.content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
          return (
            <span key={i} className={singleLine ? "whitespace-nowrap" : "whitespace-pre-wrap"}>
              {chunks.map((chunk, j) => {
                const bold = chunk.match(/^\*\*([^*]+)\*\*$/);
                if (bold) {
                  return (
                    <strong key={j} className="font-semibold text-foreground">
                      {bold[1]}
                    </strong>
                  );
                }
                return <span key={j}>{chunk}</span>;
              })}
            </span>
          );
        }
        if (part.type === "display") {
          return (
            <div
              key={i}
              className="my-3 overflow-x-auto text-[1.05em]"
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
