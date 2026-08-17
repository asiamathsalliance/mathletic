/**
 * Normalize contest math text for KaTeX rendering.
 * Cleans AoPS-style solutions into professional LaTeX.
 */

function extractBalanced(s: string, start: number): { inner: string; end: number } {
  let depth = 0;
  let i = start;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { inner: s.slice(start + 1, i), end: i + 1 };
    }
    i += 1;
  }
  return { inner: s.slice(start + 1), end: s.length };
}

function convertChoose(tex: string): string {
  return tex
    .replace(/\{([^{}]+)\\choose\s*([^{}]+)\}/g, "\\binom{$1}{$2}")
    .replace(/(\d+)\s*\\choose\s*(\d+)/g, "\\binom{$1}{$2}");
}

function cleanBoxedBody(inner: string): string {
  const trimmed = inner.trim();
  // Pure choice-letter answers must be kept (`\boxed{(A)}` / `\boxed{A}`).
  const letterOnly = trimmed.match(/^\(?([A-E])\)?\.?$/i);
  if (letterOnly) return letterOnly[1].toUpperCase();

  let body = inner
    .replace(/\\textbf\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\text\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\mathrm\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\textbf\s*([A-E])\b/gi, "")
    // Strip a leading choice callout only when more answer content follows.
    .replace(/^\s*\(([A-E])\)\s+(?=\S)/i, "")
    .replace(/^\s*\(([A-E])\}\s*\)?\s+/i, "");

  // Unwrap remaining \textbf{...} / \text{...} keeping contents.
  while (true) {
    const m = body.match(/\\(?:textbf|text|mathrm)\s*\{/);
    if (!m || m.index === undefined) break;
    const openAt = m.index + m[0].length - 1;
    const { inner: unwrapped, end } = extractBalanced(body, openAt);
    body = body.slice(0, m.index) + unwrapped + body.slice(end);
  }

  // AoPS often leaves trailing punctuation / delimiters inside \boxed{…}.
  body = body.replace(/\\(?:\]|\))\s*$/g, "").trim();
  body = body.replace(/[.,;:]+$/g, "").trim();
  // `\boxed{$28}` / `\boxed{$ 87.50}` → strip currency delimiters for KaTeX
  body = body.replace(/^\$\s*/, "").replace(/\$+$/g, "").trim();

  // If we stripped everything, fall back to a bare letter from the original inner.
  if (!body) {
    const fallback = trimmed.match(/\(([A-E])\)|^([A-E])$/i);
    if (fallback) return (fallback[1] || fallback[2] || "").toUpperCase();
  }
  return body;
}

/**
 * Extract `\boxed{…}` body.
 * - `\boxed{2000^{2001}$` (missing `}`) must stop before `$`, or it swallows the solution.
 * - `\boxed{2-\sqrt{2}.\]}` must stop before `\]` / `\)`.
 * - `\boxed{… \end{align*}}` must stop before `\end{…}`.
 * - `\boxed{$28}` keeps the leading `$` as currency content until the real `}`.
 */
function extractBoxed(s: string, openBraceAt: number): { inner: string; end: number } {
  let depth = 0;
  let i = openBraceAt;
  let seenContent = false;
  let startedWithDollar = false;

  while (i < s.length) {
    const ch = s[i];

    // Premature display/inline closers — author forgot `}` before `\]` / `\)`.
    if (depth >= 1 && ch === "\\" && (s[i + 1] === "]" || s[i + 1] === ")")) {
      return { inner: s.slice(openBraceAt + 1, i), end: i };
    }
    // Boxed answer wrongly swallowing the end of an align/equation block.
    if (depth === 1 && s.startsWith("\\end{", i)) {
      return { inner: s.slice(openBraceAt + 1, i), end: i };
    }

    if (ch === "\\") {
      seenContent = true;
      // Keep multi-char TeX commands intact (don't only skip one char).
      let j = i + 1;
      while (j < s.length && /[A-Za-z]/.test(s[j]!)) j += 1;
      if (j === i + 1) j = i + 2; // escaped symbol like \}
      i = j;
      continue;
    }
    if (ch === "$" && depth === 1) {
      if (!seenContent) {
        startedWithDollar = true;
        seenContent = true;
        i += 1;
        continue;
      }
      if (!startedWithDollar) {
        // Premature math closer — author forgot `}` before `$`.
        return { inner: s.slice(openBraceAt + 1, i), end: i };
      }
      i += 1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { inner: s.slice(openBraceAt + 1, i), end: i + 1 };
    } else if (!/\s/.test(ch)) {
      seenContent = true;
    }
    i += 1;
  }
  return { inner: s.slice(openBraceAt + 1), end: s.length };
}

/** Consume AoPS junk left after a premature `\boxed{…}` close: ` D}`, ` 15}`, `) \ 4}`. */
function skipBoxedTrailingJunk(text: string, i: number): number {
  const rest = text.slice(i);
  const patterns = [
    /^\s*[A-E]\s*\}/i,
    /^\s*\?\s*\}/,
    /^\s*-?\d+(?:\.\d+)?\s*\}/,
    /^\s*\)\s*(?:\\\s*)?-?\d+(?:\.\d+)?\s*\}/,
    /^\s+\d{1,2}:\d{2}\s*\}/,
    /^\s*(?:minutes|hours|seconds|miles(?:\s+per\s+hour)?)\s*\}/i,
    // Truncated `\boxed{…$ username}` / `\boxed{…$ as our answer}`
    /^\s*\$\s*[A-Za-z][^$]{0,60}\}/,
    /^\s*[A-Za-z][\w.\-]{2,40}\s*\}/,
    /^\s+as our answer\s*\}/i,
    /^\s+(?:quacker|answer|final)[^$]*\}/i,
  ];
  for (const p of patterns) {
    const m = rest.match(p);
    if (m) return i + m[0].length;
  }
  return i;
}

/**
 * Repair common AoPS `\boxed` corruptions before balanced extraction.
 */
function repairBrokenBoxedPatterns(text: string): string {
  let t = text;

  // `\boxed{(B}) \ 4}` / `\boxed{(B})\ 14}` → `\boxed{4}`
  t = t.replace(/\\boxed\{\(\s*([A-E])\s*\}\s*\)?\s*(?:\\\s*)?\s*(-?\d+(?:\.\d+)?)\s*\}/gi, "\\boxed{$2}");
  // `\boxed{D} D}` → `\boxed{D}`
  t = t.replace(/\\boxed\{\s*([A-E])\s*\}\s*\1\s*\}/gi, "\\boxed{$1}");
  // `\boxed{B} 15}` → `\boxed{15}`
  t = t.replace(/\\boxed\{\s*([A-E])\s*\}\s*(-?\d+(?:\.\d+)?)\s*\}/gi, "\\boxed{$2}");
  // `\boxed{?}450}` → `\boxed{450}`
  t = t.replace(/\\boxed\{\s*\?\s*\}\s*(-?\d+(?:\.\d+)?)\s*\}/g, "\\boxed{$1}");
  // `\boxed{?}450}$` / `\boxed{?}450$.` (closing `}` already used by outer math)
  t = t.replace(/\\boxed\{\s*\?\s*\}\s*(-?\d+(?:\.\d+)?)(?=\s*\$)/g, "\\boxed{$1}");
  // `\boxed{-}88}` → `\boxed{-88}`
  t = t.replace(/\\boxed\{\s*-\s*\}\s*(\d+(?:\.\d+)?)\s*\}/g, "\\boxed{-$1}");
  // `\boxed{15 seconds after} 4:58}` → `\boxed{15 seconds after 4:58}`
  t = t.replace(/\\boxed\{([^{}]+)\}\s+(\d{1,2}:\d{2})\s*\}/g, "\\boxed{$1 $2}");
  // `\boxed{the point}\left(...\right)}` → `\boxed{the point \left(...\right)}`
  t = t.replace(
    /\\boxed\{([^{}]+)\}(\\left[\s\S]*?\\right\))\s*\}/g,
    "\\boxed{$1 $2}"
  );
  // `\text{\boxed{18}$` / `\text{\boxed{18}}` → `\boxed{18}`
  t = t.replace(/\\text\s*\{\s*\\boxed\{((?:[^{}]|\{[^{}]*\})+)\}?\s*\$?\s*\}?/g, "\\boxed{$1}");
  // `$ \boxed{… . \end{align*}}$` → `\boxed{…} \end{align*}$$` (keep display close)
  // Note: in JS replace strings, `$$` means a literal `$` — use a function replacer for `$$`.
  t = t.replace(
    /\$\s*\\boxed\{((?:[^{}]|\{[^{}]*\})+)\.\s*\\end\{(align\*?)\}\s*\}?\s*\$/g,
    (_m, body: string, env: string) => `\\boxed{${body}} \\end{${env}}$$`
  );
  // `\boxed{… . \end{align*}}` (no wrapping $)
  t = t.replace(
    /\\boxed\{((?:[^{}]|\{[^{}]*\})+)\.\s*\\end\{(align\*?)\}\s*\}/g,
    (_m, body: string, env: string) => `\\boxed{${body}} \\end{${env}}$$`
  );
  // Truncated currency/unit tails: `\boxed{3 \frac{3}{4}$ minutes}` → `\boxed{3 \frac{3}{4}}$ minutes`
  t = t.replace(
    /\\boxed\{((?:[^{}]|\{[^{}]*\})+)\$\s*((?:minutes|hours|seconds|miles(?:\s+per\s+hour)?)[^}]*)\}/gi,
    "\\boxed{$1}$ $2"
  );
  // Extra closing braces after a well-formed boxed: `\boxed{…}$.}}` / `\boxed{…}$.}`
  t = t.replace(/(\\boxed\{(?:[^{}]|\{[^{}]*\})+\})(\s*[.$]*)\}+/g, "$1$2");
  // `\boxed{…} prose credit}` / `\boxed{…} as our answer}` still inside `$…$`
  t = t.replace(
    /(\\boxed\{(?:[^{}]|\{[^{}]*\})+\})\s+[A-Za-z][^$]*?\}(\$?)/g,
    "$1$2"
  );
  t = t.replace(/\\bold\s*\{/g, "\\mathbf{");
  // `\mathrm{\boxed{…}` / `\mathbf{\boxed{…}.` with truncated closers
  t = t.replace(/\\(?:mathrm|mathbf|textbf|bold)\s*\{\s*(\\boxed\{)/g, "$1");

  return t;
}

function replaceBoxed(text: string): string {
  text = repairBrokenBoxedPatterns(text);
  text = text.replace(/\\boxed\s*\{/g, "\\boxed{");
  let out = "";
  let i = 0;
  while (true) {
    const j = text.indexOf("\\boxed{", i);
    if (j < 0) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, j);
    const { inner, end } = extractBoxed(text, j + "\\boxed".length);
    const cleaned = cleanBoxedBody(inner);
    out += `\\boxed{${cleaned || inner.trim() || "?"}}`;
    i = skipBoxedTrailingJunk(text, end);
    // `\boxed{… .\]}` → we stop before `\]` and must drop the orphan `}` after it.
    if (
      (text.startsWith("\\]", i) || text.startsWith("\\)", i)) &&
      text[i + 2] === "}"
    ) {
      out += text.slice(i, i + 2);
      i += 3;
    }
  }
  // Orphan closers left after truncated boxes: `\]}` / `\) }`
  out = out.replace(/\\\]\}/g, "\\]");
  out = out.replace(/\\\)\}/g, "\\)");
  return out;
}

/** Ensure every \boxed{…} sits inside math delimiters so KaTeX renders it. */
function wrapBareBoxed(text: string): string {
  let out = "";
  let i = 0;
  let inInline = false;
  let inDisplay = false;

  while (i < text.length) {
    if (text.startsWith("$$", i)) {
      if (inInline) {
        out += "$\n\n$$";
        inInline = false;
        inDisplay = true;
      } else {
        inDisplay = !inDisplay;
        out += "$$";
      }
      i += 2;
      continue;
    }
    if (!inDisplay && text[i] === "\\" && (text[i + 1] === "[" || text[i + 1] === "(")) {
      const close = text[i + 1] === "[" ? "\\]" : "\\)";
      const end = text.indexOf(close, i + 2);
      if (end < 0) {
        out += text[i];
        i += 1;
        continue;
      }
      // Copy whole display/inline bracket block (includes any \boxed inside).
      out += text.slice(i, end + close.length);
      i = end + close.length;
      continue;
    }
    // Bare display environments already math-mode — copy through, don't wrap \boxed.
    if (!inDisplay && !inInline) {
      const env = text
        .slice(i)
        .match(
          /^\\begin\{(align|equation|gather|multline|eqnarray|alignat)\*?\}[\s\S]*?\\end\{\1\*?\}/
        );
      if (env) {
        out += env[0];
        i += env[0].length;
        continue;
      }
    }
    if (!inDisplay && text[i] === "$") {
      inInline = !inInline;
      out += "$";
      i += 1;
      continue;
    }

    if (!inInline && !inDisplay && text.startsWith("\\boxed{", i)) {
      const { end } = extractBoxed(text, i + "\\boxed".length);
      const block = text.slice(i, end);
      // AoPS often writes \boxed{…}$ with a dangling closer and no opener.
      let j = end;
      if (text[j] === "$") j += 1;
      out += `$${block}$`;
      i = j;
      continue;
    }

    out += text[i];
    i += 1;
  }
  return out;
}

/**
 * Close dangling `$` / repair truncated finals like `$\boxed{…}` without trailing `$`.
 */
function repairDollarBalance(text: string): string {
  let dollars = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "$") dollars += 1;
  }
  if (dollars % 2 === 1) {
    // Prefer closing after a boxed group at the end.
    const trimmed = text.replace(/\s+$/, "");
    if (/\\boxed\{[\s\S]*\}$/.test(trimmed) && !trimmed.endsWith("$")) {
      return `${trimmed}$`;
    }
    return `${trimmed}$`;
  }
  return text;
}

/**
 * Ensure display environments are wrapped in $$…$$ (not a single `$`, and not $$$$…).
 */
function fixDisplayDollarEnvs(text: string): string {
  const envNames = "align|equation|gather|multline|eqnarray|alignat";
  let t = text;
  // $$$$begin / $$$begin → $$begin
  t = t.replace(/\$\$\$+(\s*\\begin\{)/g, (_m, begin: string) => `$$${begin}`);
  // Drop stray `$` immediately before \boxed inside a display env.
  t = t.replace(/(\&\s*)\$(\\boxed\{)/g, "$1$2");
  // Any $-wrapped display env (open with 1+ $, close with 1+ $) → $$…$$
  t = t.replace(
    new RegExp(
      String.raw`(?<!\$)\${1,3}(\s*\\begin\{(?:${envNames})\*?\}[\s\S]*?\\end\{(?:${envNames})\*?\})\s*\${1,3}(?!\$)`,
      "g"
    ),
    (_m, block: string) => `$$${block}$$`
  );
  // \end{env}$ / \end{env}$$$ → \end{env}$$
  t = t.replace(
    new RegExp(String.raw`(\\end\{(?:${envNames})\*?\})\s*\$+`, "g"),
    (_m, end: string) => `${end}$$`
  );
  // `$$\begin…\end{env}` missing closer → append $$
  t = t.replace(
    new RegExp(
      String.raw`\$\$(\\begin\{(?:${envNames})\*?\}[\s\S]*?\\end\{(?:${envNames})\*?\})(?!\$)`,
      "g"
    ),
    (_m, block: string) => `$$${block}$$`
  );
  // Orphan `$` after a display close
  t = t.replace(/(\$\$|\\\])\s*\$\s*$/g, "$1");
  t = t.replace(/(\$\$|\\\])\s*\$(?=\s*[A-Za-z])/g, "$1 ");
  // Orphan `$` after sentence punctuation before prose: `end.$ Note` → `end. Note`
  // Do NOT strip the closer in `$P.$ A fly` / `$x.$ Next` (odd $ count before `.`).
  t = stripOrphanDollarAfterPunctuation(t);
  return t;
}

/**
 * Remove a stray `$` after `.!?` before capitalized prose, but keep closers
 * for inline math that ends with punctuation (`$P.$ Next`).
 */
function stripOrphanDollarAfterPunctuation(text: string): string {
  return text.replace(/([.!?])\s*\$(?=\s+[A-Z])/g, (match, punct: string, offset: number) => {
    let dollars = 0;
    for (let i = 0; i < offset; i++) {
      if (text[i] === "\\") {
        i += 1;
        continue;
      }
      if (text[i] === "$") dollars += 1;
    }
    // Odd → this `$` closes an open inline span. Keep it.
    if (dollars % 2 === 1) return match;
    return punct;
  });
}

function wrapDisplayEnvs(text: string): string {
  const envs = [
    "align\\*?",
    "equation\\*?",
    "gather\\*?",
    "multline\\*?",
    "eqnarray\\*?",
    "alignat\\*?",
  ];
  let out = fixDisplayDollarEnvs(text);
  for (const env of envs) {
    const re = new RegExp(
      String.raw`(?<!\$)\s*(\\begin\{${env}\}[\s\S]*?\\end\{${env}\})\s*(?!\$)`,
      "g"
    );
    out = out.replace(re, (_m, block: string) => `\n\n$$${block.trim()}$$\n\n`);
  }
  // KaTeX: `\\ [2ex] \hline` spacing breaks array context for \hline
  out = out.replace(/\\\\\s*\[[^\]]*\]\s*(?=\\hline)/g, "\\\\ ");
  out = out.replace(/\\\\\s*\[[^\]]*\]\s*/g, "\\\\ ");
  return fixDisplayDollarEnvs(out);
}

function tidyMathSpacing(text: string): string {
  return text
    .replace(/\$\s+([.,;:!?])/g, "$$1")
    .replace(/([(\[])\s+\$/g, "$1$")
    .replace(/\$\s+([)\]])/g, "$$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * AoPS uses \textdollar (unsupported by KaTeX). Currency `$12` was often
 * ingested as `$$12$` / `$$$$12$`, which breaks delimiter parsing and
 * swallows following prose into math (missing spaces / weird line breaks).
 */
function fixCurrencyDollars(text: string): string {
  let t = text;

  // \textdollar / bare textdollar → \$
  t = t.replace(/\\textdollar\s*/g, "\\$");
  t = t.replace(/(?<![\\a-zA-Z])textdollar\s*/gi, "\\$");
  // AoPS \cent (cents) — not a KaTeX symbol (avoid ¢ glyph metrics issues)
  t = t.replace(/\\cent\b/g, "\\text{c}");

  // Currency mistaken for nested display: $$$$12.50$ or $$12$ → $\$12.50$
  t = t.replace(/\$\$\$\$(\d+(?:\.\d+)?)\$/g, "$\\$$$1$");
  t = t.replace(/\$\$(\d+(?:\.\d+)?)\$/g, "$\\$$$1$");

  // Extra $$ before a real display environment: $$$$\begin{...}
  t = t.replace(/\$\$\$\$(?=\\begin\{)/g, "$$");

  // Leftover empty quadruple dollars
  t = t.replace(/\$\$\$\$/g, "$$");

  return t;
}

/**
 * Fix cramped `\mathrm` (units/prose) and unwrap plain-English MCQ choices
 * like `$\mathrm{even}$` / `$\mathrm{divisible by }3$` / `$\mathrm{\prime}$`.
 */
function fixMathrmSpacing(text: string): string {
  let t = text;

  // AoPS sometimes writes "prime" as \mathrm{\prime}
  t = t.replace(/\\mathrm\{\s*\\prime\s*\}/g, "\\mathrm{prime}");

  // Whole-choice prose: $\mathrm{even}$ → even
  t = t.replace(/^\$\\mathrm\{([^{}]*)\}\$$/g, (_m, inner: string) => {
    const plain = inner
      .replace(/\\prime/g, "prime")
      .replace(/\\,/g, " ")
      .replace(/\\ /g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (/^[A-Za-z][A-Za-z0-9\s.,;:'"()\-]*$/.test(plain)) return plain;
    return `$\\mathrm{${inner}}$`;
  });

  // $\mathrm{divisible by }3$ → divisible by 3
  t = t.replace(/^\$\\mathrm\{([^{}]*)\}(\d+)\$$/g, (_m, words: string, num: string) => {
    const plain = words
      .replace(/\\,/g, " ")
      .replace(/\\ /g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (/^[A-Za-z][A-Za-z0-9\s.,;:'"()\-]*$/.test(plain)) return `${plain} ${num}`;
    return `$\\mathrm{${words}}${num}$`;
  });

  // 12\mathrm{cm} → 12\,\mathrm{cm}
  t = t.replace(/(\d)\s*\\mathrm\b/g, "$1\\,\\mathrm");

  // Glue words: ...}\mathrm{if} → ...}\ \mathrm{if}
  t = t.replace(
    /([^\\\s$])\\mathrm\{(if|and|or|otherwise|when|where)\b/gi,
    "$1\\ \\mathrm{$2"
  );

  return t;
}

/**
 * KaTeX forbids most math commands inside \text{…}. Flatten common AoPS cases.
 * Also repair set literals written as `${1, 2\}$` (missing open \{).
 */
function sanitizeTextModeAndSets(text: string): string {
  let t = text;

  // `${-1, 0\}$` → `$\{-1, 0\}$`
  t = t.replace(/\$\{([-+0-9.,\s]+)\\?\}\$/g, "$\\{$1\\}$");

  // Unsupported / unsafe contest macros
  t = t.replace(/\\linebreak\b/g, "\\\\ ");
  t = t.replace(/\\break\b/g, "\\\\ ");
  t = t.replace(/\\overarc\b/g, "\\overset{\\frown}");
  t = t.replace(/\\mbox\s*\{/g, "\\text{");
  t = t.replace(/\\operatorname\s*\{\s*\\lcm\s*\}/g, "\\operatorname{lcm}");
  t = t.replace(/\\text\s*\{\s*\\gcd\s*\}/g, "\\gcd");
  t = t.replace(/\\text\s*\{\s*\\lcm\s*\}/g, "\\operatorname{lcm}");
  t = t.replace(/\\lcm\b/g, "\\operatorname{lcm}");

  // KaTeX has no tabular / eqnarray — map to array / align.
  t = t.replace(/\\begin\{tabular\}\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, "\\begin{array}{c}");
  t = t.replace(/\\end\{tabular\}/g, "\\end{array}");
  t = t.replace(/\\begin\{eqnarray\*?\}/g, "\\begin{align*}");
  t = t.replace(/\\end\{eqnarray\*?\}/g, "\\end{align*}");
  // Bad restore artifacts
  t = t.replace(/\\operatorname@/g, "\\operatorname");
  // Prose `#` (e.g. "the # of balls") — escape only outside math delimiters later if needed.

  t = t.replace(/\\text\s*\{([^{}]*)\}/g, (_m, inner: string) => {
    let s = inner;
    s = s.replace(/\\parallel/g, "parallel");
    s = s.replace(/\\triangle/g, "triangle");
    s = s.replace(/\\prime/g, "prime");
    s = s.replace(/\\angle/g, "angle");
    s = s.replace(/\\circ/g, "°");
    s = s.replace(/\\gcd/g, "gcd");
    s = s.replace(/\\lcm/g, "lcm");
    s = s.replace(/\\log\b/g, "log");
    s = s.replace(/\\ln\b/g, "ln");
    s = s.replace(/\\to\b/g, "to");
    return `\\text{${s}}`;
  });

  t = t.replace(/\\ensuremath\s*\{([^{}]*)\}/g, "$1");
  t = t.replace(/\\root\s*\{([^{}]*)\}\s*\\of\s*\{([^{}]*)\}/g, "\\sqrt[$1]{$2}");
  t = t.replace(/\\root\s*\\of\s*\{([^{}]*)\}/g, "\\sqrt{$1}");

  return t;
}

/** Repair stray `$` opened inside align/equation bodies before `\boxed`. */
function repairAlignDollarGlitches(text: string): string {
  let t = text;
  // Drop a `$` immediately before `\boxed` when still inside an align that closes later.
  t = t.replace(/(\&(?:=|\\leq|\\geq|\\neq)?\s*)\$(\\boxed\{)/g, "$1$2");
  // Close display-math envs with $$ (not a single $).
  t = t.replace(
    /\\end\{(align\*?|equation\*?|gather\*?|alignat\*?)\}\s*\$\$\$+/g,
    (_m, env: string) => `\\end{${env}}$$`
  );
  t = t.replace(
    /\\end\{(align\*?|equation\*?|gather\*?|alignat\*?)\}\s*\$([^$])/g,
    (_m, env: string, next: string) => `\\end{${env}}$$\n${next}`
  );
  t = t.replace(
    /\\end\{(align\*?|equation\*?|gather\*?|alignat\*?)\}\s*\$$/g,
    (_m, env: string) => `\\end{${env}}$$`
  );
  // Trailing prose after a closed solution then orphan `$$`
  t = t.replace(/(\$\s*\\boxed\{(?:[^{}]|\{[^{}]*\})+\}\s*\$)([^$]*?)\$\$\s*$/g, "$1$2");
  return t;
}

/** Strip / unwrap centering wrappers; KaTeX display math is already centered. */
function normalizeCentering(text: string): string {
  let t = text.replace(
    /\\begin\{center\}\s*([\s\S]*?)\s*\\end\{center\}/gi,
    "\n\n$1\n\n"
  );
  t = t.replace(/\\centering\b/g, "");
  t = t.replace(/\\centerline\s*\{([^{}]*)\}/g, (_m, inner: string) => `\n\n$$${inner}$$\n\n`);
  return t;
}

/** Drop a trailing orphan `$` left after bad AoPS currency ingestion. */
function stripOrphanTrailingDollar(text: string): string {
  let dollars = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "$") dollars += 1;
  }
  if (dollars % 2 === 1 && /[.!?]\$\s*$/.test(text)) {
    return text.replace(/([.!?])\$\s*$/, "$1");
  }
  return text;
}

/**
 * Wrap bare `\$12.50` (outside math) as `$\$12.50$` so KaTeX shows a dollar amount.
 * Also repair choice artifacts: trailing `\$$` / unwrapped `\text{…}$$`.
 */
function wrapBareDollarAmounts(text: string): string {
  let t = text;

  // `\text{…}$$` with no opener
  if (/^\\text\s*\{/.test(t.trim()) && /\$\$\s*$/.test(t)) {
    t = `$${t.trim().replace(/\$\$\s*$/, "")}$`;
  }

  // Dangling choice closers: `… \$$` / `…$$` after an opened inline span
  t = t.replace(/(\$[^$]*?)\s*\\\$\$\s*$/g, "$1$");
  t = t.replace(/(\$[^$]*?)\s*\$\$\s*$/g, "$1$");
  t = t.replace(/\s*\\\$\$\s*$/g, "");

  let out = "";
  let i = 0;
  let inInline = false;
  let inDisplay = false;

  while (i < t.length) {
    if (t.startsWith("$$", i)) {
      if (inInline) {
        out += "$\n\n$$";
        inInline = false;
        inDisplay = true;
      } else {
        inDisplay = !inDisplay;
        out += "$$";
      }
      i += 2;
      continue;
    }
    if (inDisplay && t[i] === "$") {
      // AoPS often writes `&= $\boxed{…}` inside $$…$$ — drop only that spurious `$`.
      const after = t.slice(i + 1).match(/^\s*(\\boxed\{)/);
      if (after) {
        i += 1;
        continue;
      }
      // Otherwise the display opener was never closed — close it, then handle `$`.
      out += "$$";
      inDisplay = false;
      // fall through to inline `$` handling below
    }
    if (!inDisplay && t[i] === "$") {
      // Escaped \$ handled below; plain $ toggles inline.
      inInline = !inInline;
      out += "$";
      i += 1;
      continue;
    }
    if (!inInline && !inDisplay && t.startsWith("\\$", i)) {
      const m = t.slice(i).match(/^\\\$\s*(\d+(?:\.\d+)?)/);
      if (m) {
        out += `$\\$${m[1]}$`;
        i += m[0].length;
        continue;
      }
    }
    if (t[i] === "\\" && t[i + 1] !== undefined) {
      out += t[i] + t[i + 1];
      i += 2;
      continue;
    }
    out += t[i];
    i += 1;
  }
  return out;
}

/** Repair choice-only artifacts like trailing `\$$` / unwrapped `\text{…}`. */
function fixChoiceWrappers(choice: string): string {
  let c = wrapBareDollarAmounts(choice.trim());
  c = c.replace(/\s*\\\\\$\s*$/g, "");
  c = c.replace(/\s*\\\$\$\s*$/g, "");
  c = c.replace(/\s*\\\$\s*$/g, "");
  c = c.replace(/\s*\$\$\s*$/g, "");
  if (/^\\text\s*\{/.test(c) && !c.includes("$")) {
    c = `$${c}$`;
  }
  if (/^\\\$\s*\d/.test(c) && !/\$[^$]/.test(c.slice(1))) {
    c = `$${c.replace(/\s+/g, "")}$`;
  }
  return c;
}

function stripCredits(text: string): string {
  let t = text.replace(
    /^(?:solution\s+by|solutions?\s+by|posted\s+by|edited\s+by|~|—|-)\s*[\w.\-]+.*$/gim,
    ""
  );
  t = t.replace(/(?:\n|^)\s*~+\s*[\w.\-]+\s*$/gim, "");
  t = t.replace(/(?:\n|^)\s*[-—]+\s*[A-Za-z][\w.\-]{2,40}\s*$/gim, "");
  // "Solution by: name" / "Solution edited by a and b" (sometimes a stray `}`)
  t = t.replace(
    /\s*Solution\s+(?:edited\s+)?by:?\s+[\w.\-]+(?:\s+and\s+[\w.\-]+)*\}?\.?\s*$/gim,
    ""
  );
  t = t.replace(/\s*Solutions?\s+by:?\s+[\w.\-]+(?:\s+and\s+[\w.\-]+)*\}?\.?\s*$/gim, "");
  // AoPS figure credits: `(diagram by name)` / `(minor edits by name)}`
  t = t.replace(/\n*\(\s*(?:diagram|figure|image|edits?|minor(?:\s+formatting)?\s+changes?)\s+by[^)]*\)\s*\}?/gi, "");
  t = t.replace(/\n*\(\s*[^)]*\bby\b[^)]*\)\s*\}?\s*$/gim, "");
  t = t.replace(/\\color\{[^}]+\}\s*[\w.\-]+/g, "");
  // Orphan trailing `}` left after truncated `\boxed{…$ …}`
  t = t.replace(/([.!?])\s*\}+\s*$/g, "$1");
  t = t.replace(/\$\s*\}+\s*$/g, "$");
  return t.trim();
}

/**
 * Drop AoPS wiki image placeholders left in scraped stems, e.g.
 * `Image:2003amc10a10.gif` or `<!-- <center>Image:….png</center> -->`.
 * Keeps real `<center>…math…</center>` wrappers intact.
 */
function stripImagePlaceholders(text: string): string {
  let t = text;
  t = t.replace(
    /<!--\s*(?:<center>\s*)?Image:[^>]+?(?:<\/center>\s*)?-->/gi,
    ""
  );
  t = t.replace(
    /(?:^|\n)\s*(?:<center>\s*)?Image:\s*[^\n<]+(?:\s*<\/center>)?\s*(?=\n|$)/gi,
    "\n"
  );
  t = t.replace(/(?:^|\n)\s*<center>\s*<\/center>\s*(?=\n|$)/gi, "\n");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** Restore missing backslashes before common TeX commands inside a math body. */
const TEX_COMMANDS = [
  "longrightarrow",
  "Leftarrow",
  "Rightarrow",
  "leftrightarrow",
  "overline",
  "underline",
  "triangle",
  "parallel",
  "approx",
  "infty",
  "emptyset",
  "langle",
  "rangle",
  "subset",
  "supset",
  "subseteq",
  "supseteq",
  "equiv",
  "leq",
  "geq",
  "neq",
  "cdot",
  "cdots",
  "ldots",
  "times",
  "div",
  "pm",
  "mp",
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "log",
  "ln",
  "exp",
  "lim",
  "sum",
  "prod",
  "int",
  "dfrac",
  "tfrac",
  "frac",
  "sqrt",
  "binom",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "theta",
  "lambda",
  "mu",
  "pi",
  "rho",
  "sigma",
  "phi",
  "omega",
  "Gamma",
  "Delta",
  "Theta",
  "Lambda",
  "Pi",
  "Sigma",
  "Phi",
  "Omega",
  // Note: do NOT include bare "left"/"right" — they false-positive on English
  // ("right triangle") and become invalid `\right` without a delimiter.
  "text",
  "mathrm",
  "mathbf",
  "angle",
  "circ",
  "quad",
  "qquad",
  "begin",
  "end",
  "rightarrow",
  "leftarrow",
];

const BARE_CMD_RE = new RegExp(
  `(?<![\\\\a-zA-Z])(${TEX_COMMANDS.map(escapeRegExp).join("|")})(?![a-zA-Z])`,
  "g"
);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function restoreCommandBackslashes(mathInner: string): string {
  let prev = "";
  let out = mathInner;
  while (prev !== out) {
    prev = out;
    out = out.replace(BARE_CMD_RE, "\\$1");
  }
  return out
    .replace(/\\boxed\{frac\{/g, "\\boxed{\\frac{")
    .replace(/\\boxed\{dfrac\{/g, "\\boxed{\\dfrac{")
    .replace(/\\boxed\{sqrt/g, "\\boxed{\\sqrt")
    .replace(/\\boxed\{binom/g, "\\boxed{\\binom");
}

function restoreBackslashesInMathFields(text: string): string {
  return text.replace(
    /(\$\$)([\s\S]*?)(\$\$)|(\$)((?:\\.|[^$\\])*)(\$)|(\\\[)([\s\S]*?)(\\\])|(\\\()([\s\S]*?)(\\\))/g,
    (full, d1, d2, d3, s1, s2, s3, b1, b2, b3, p1, p2, p3) => {
      if (d1) return d1 + restoreCommandBackslashes(d2) + d3;
      if (s1) return s1 + restoreCommandBackslashes(s2) + s3;
      if (b1) return b1 + restoreCommandBackslashes(b2) + b3;
      if (p1) return p1 + restoreCommandBackslashes(p2) + p3;
      return full;
    }
  );
}

/**
 * Normalize a solution (or question stem) for professional KaTeX display.
 */
/**
 * Fix `$…$$` delimiter ambiguity before display envs.
 * `$ or $$\begin{align}` is otherwise parsed as `$ or $` + `$\begin…$` (inline align).
 */
function separateInlineBeforeDisplay(text: string): string {
  let out = "";
  let i = 0;
  let inInline = false;
  let inDisplay = false;
  while (i < text.length) {
    if (text.startsWith("$$", i)) {
      if (inInline) {
        out += "$\n\n$$";
        inInline = false;
        inDisplay = true;
      } else {
        inDisplay = !inDisplay;
        out += "$$";
      }
      i += 2;
      continue;
    }
    if (!inDisplay && text[i] === "$") {
      inInline = !inInline;
      out += "$";
      i += 1;
      continue;
    }
    if (text[i] === "\\" && text[i + 1] !== undefined) {
      out += text[i] + text[i + 1];
      i += 2;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/** Strip `$` glued to `\boxed` (illegal inside align/$$ and redundant with wrapBareBoxed). */
function stripDollarsAroundBoxed(text: string): string {
  return text
    .replace(/\$\s*(\\boxed\{)/g, "$1")
    .replace(/(\\boxed\{(?:[^{}]|\{[^{}]*\})+\})\s*\$/g, "$1")
    .replace(/\$\s*\$/g, " ");
}

function isDisplayOpenAt(text: string, i: number): boolean {
  return (
    text.startsWith("\\[", i) ||
    text.startsWith("\\begin{align", i) ||
    text.startsWith("\\begin{equation", i) ||
    text.startsWith("\\begin{gather", i) ||
    text.startsWith("\\begin{alignat", i) ||
    text.startsWith("\\begin{multline", i) ||
    text.startsWith("\\begin{eqnarray", i)
  );
}

/**
 * Close an open inline `$…` before `\[` / `\begin{align…}` so display math is not
 * swallowed into `$…$`. Prefer cutting after sentence punctuation when present.
 * `$x+40. We have \[…\]` → `$x+40$. We have \[…\]`
 */
function closeInlineBeforeDisplayMath(text: string): string {
  let out = "";
  let i = 0;
  let inInline = false;
  let inDisplayDollar = false;

  while (i < text.length) {
    if (!inInline && text.startsWith("$$", i)) {
      inDisplayDollar = !inDisplayDollar;
      out += "$$";
      i += 2;
      continue;
    }
    if (!inDisplayDollar && text[i] === "$") {
      inInline = !inInline;
      out += "$";
      i += 1;
      continue;
    }
    if (inInline && isDisplayOpenAt(text, i)) {
      // Close after `.!?` if the tail looks like prose before display.
      const cut = out.match(/^(.*[.!?])(\s+[A-Za-z][A-Za-z\s,]{0,40})$/);
      if (cut) {
        out = `${cut[1]}$${cut[2]}`;
      } else if (!out.endsWith("$")) {
        out += "$";
      }
      inInline = false;
      continue; // reprocess display opener
    }
    if (text[i] === "\\" && text[i + 1] !== undefined) {
      out += text[i] + text[i + 1];
      i += 2;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/**
 * Remove Asymptote diagram blocks. AoPS uses `[asy]…[/asy]`; some bank rows
 * store the same diagrams as Markdown fences (```asy … ```), which otherwise
 * leak into the UI and break `$A$` / `$1$` labels inside the code.
 */
function stripAsymptoteBlocks(text: string): string {
  let t = text;
  t = t.replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "");
  t = t.replace(/```(?:asy|asymptote)[^\n]*\n[\s\S]*?```/gi, "");
  // Rare: bare fence with no language tag that is clearly Asymptote
  t = t.replace(
    /```\s*\n(?:\s*(?:unitsize|import\s+graph|pair\s+[A-Z]\s*=)[\s\S]*?)```/gi,
    ""
  );
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeLatexContent(input: string | null | undefined): string {
  if (!input) return "";
  let text = String(input);

  text = stripAsymptoteBlocks(text);
  text = stripImagePlaceholders(text);
  text = stripCredits(text);
  text = fixCurrencyDollars(text);
  text = separateInlineBeforeDisplay(text);
  text = closeInlineBeforeDisplayMath(text);
  text = fixMathrmSpacing(text);
  text = wrapBareDollarAmounts(text);
  text = normalizeCentering(text);
  text = convertChoose(text);
  text = repairAlignDollarGlitches(text);
  text = replaceBoxed(text);
  text = stripDollarsAroundBoxed(text);
  text = repairAlignDollarGlitches(text);
  text = wrapBareBoxed(text);
  text = wrapDisplayEnvs(text);
  text = fixDisplayDollarEnvs(text);
  text = separateInlineBeforeDisplay(text);
  text = closeInlineBeforeDisplayMath(text);
  // Strip $ glued to \boxed inside $$ / align (wrapBareBoxed may have re-wrapped earlier).
  text = stripDollarsAroundBoxed(text);
  // Re-wrap any bare \boxed that is still outside math delimiters.
  text = wrapBareBoxed(text);

  // Answer-choice callouts → plain (C)
  text = text.replace(/\$?\\textbf\s*\{\s*\(([A-E])\)\s*\}\\?\$?/g, "($1)");
  text = text.replace(/\\textbf\s*\{\s*\(([A-E])\)\s*\}/g, "($1)");
  text = text.replace(/\\text\s*\{\s*\(([A-E])\)\s*\}/g, "($1)");
  // Only unwrap textbf when not eating a math command
  text = text.replace(/\\textbf\s*\{([^{}]*)\}/g, "$1");

  text = text.replace(/(?:^|\n)\s*Remark\.?\s*\n?/gi, "\n\n**Remark.** ");
  text = text.replace(/\\qquad/g, " ");
  text = text.replace(/\\quad/g, " ");
  text = text.replace(/~/g, " ");
  text = text.replace(/([.!?])\s*(\$\\boxed\{)/g, "$1\n\n$2");
  text = text.replace(/(Solution\s*\d+)\s*(?=[A-Za-z])/g, "$1. ");

  // Stub answers
  text = text.replace(
    /^The correct answer is \(([A-E])\)\.$/,
    (_m, letter: string) => `The correct answer is $\\boxed{${letter}}$.`
  );

  text = restoreBackslashesInMathFields(text);
  // After restoring bare commands, flatten illegal math cmds inside \text{…}
  // (restore would otherwise turn "parallel" back into \parallel).
  text = sanitizeTextModeAndSets(text);
  text = stripOrphanTrailingDollar(text);
  // Choice artifacts sometimes leak into stems too: trailing `\\$` / `\$$`
  text = text.replace(/\s*\\\\\$\s*$/g, "");
  text = text.replace(/\s*\\\$\$\s*$/g, "");
  // Credits / orphan `}` often sit after truncated boxes — strip again late.
  text = text.replace(
    /\n*\(\s*(?:diagram|figure|image|edits?|minor(?:\s+formatting)?\s+changes?)\s+by[^)]*\)\s*\}?/gi,
    ""
  );
  text = text.replace(/([.!?])\s*\}+\s*$/g, "$1");
  text = repairDollarBalance(text);

  return tidyMathSpacing(text);
}

/** Wrap a short choice in $...$ when it is clearly math. */
export function normalizeChoice(choice: string | null | undefined): string {
  if (!choice) return "";
  const c = fixMathrmSpacing(
    fixChoiceWrappers(fixCurrencyDollars(String(choice).trim()))
  );
  if (!c) return c;
  // Pure prose after \mathrm unwrap — no need to wrap in math.
  if (!/[\\$^_]/.test(c) && /[A-Za-z]/.test(c)) return c;
  if (c.includes("$")) return normalizeLatexContent(c);
  if (/^[-+]?\d+(\.\d+)?$/.test(c)) return `$${c}$`;
  if (/^[-+]?\d+\/\d+$/.test(c)) return `$${c}$`;
  if (/[\\^_{}]/.test(c) || /[≤≥≠∞π√]/.test(c) || /(?<!\\)(frac|dfrac|sqrt|binom)\b/.test(c)) {
    const fixed = restoreCommandBackslashes(c);
    return `$${fixed}$`;
  }
  return c;
}
