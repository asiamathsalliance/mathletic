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
  let body = inner
    .replace(/\\textbf\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\text\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\mathrm\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\textbf\s*([A-E])\b/gi, "")
    .replace(/^\s*\(([A-E])\)\s*/i, "");

  // Unwrap remaining \textbf{...} / \text{...} keeping contents.
  while (true) {
    const m = body.match(/\\(?:textbf|text|mathrm)\s*\{/);
    if (!m || m.index === undefined) break;
    const openAt = m.index + m[0].length - 1;
    const { inner: unwrapped, end } = extractBalanced(body, openAt);
    body = body.slice(0, m.index) + unwrapped + body.slice(end);
  }

  // AoPS often leaves trailing punctuation inside \boxed{…}.
  body = body.replace(/[.,;:]+$/g, "").trim();
  // `\boxed{$28}` / `\boxed{$ 87.50}` → strip currency delimiters for KaTeX
  body = body.replace(/^\$\s*/, "").replace(/\$+$/g, "").trim();
  return body;
}

/**
 * Extract `\boxed{…}` body.
 * - `\boxed{2000^{2001}$` (missing `}`) must stop before `$`, or it swallows the solution.
 * - `\boxed{$28}` keeps the leading `$` as currency content until the real `}`.
 */
function extractBoxed(s: string, openBraceAt: number): { inner: string; end: number } {
  let depth = 0;
  let i = openBraceAt;
  let seenContent = false;
  let startedWithDollar = false;

  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") {
      seenContent = true;
      i += 2;
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

function replaceBoxed(text: string): string {
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
    out += `\\boxed{${cleaned || "?"}}`;
    i = end;
  }
  return out;
}

/** Ensure every \boxed{…} sits inside math delimiters so KaTeX renders it. */
function wrapBareBoxed(text: string): string {
  let out = "";
  let i = 0;
  let inInline = false;
  let inDisplay = false;

  while (i < text.length) {
    if (!inInline && text.startsWith("$$", i)) {
      inDisplay = !inDisplay;
      out += "$$";
      i += 2;
      continue;
    }
    if (!inDisplay && text[i] === "\\" && (text[i + 1] === "[" || text[i + 1] === "(")) {
      const close = text[i + 1] === "[" ? "\\]" : "\\)";
      const open = text.slice(i, i + 2);
      const end = text.indexOf(close, i + 2);
      if (end < 0) {
        out += text[i];
        i += 1;
        continue;
      }
      out += text.slice(i, end + close.length);
      i = end + close.length;
      continue;
    }
    if (!inDisplay && text[i] === "$") {
      inInline = !inInline;
      out += "$";
      i += 1;
      continue;
    }
    if (text[i] === "\\" && text[i + 1] !== undefined) {
      // skip escaped char in non-boxed path
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

function wrapDisplayEnvs(text: string): string {
  const envs = ["align\\*?", "equation\\*?", "gather\\*?", "multline\\*?", "eqnarray\\*?"];
  let out = text;
  for (const env of envs) {
    const re = new RegExp(
      String.raw`(?<!\$)\s*(\\begin\{${env}\}[\s\S]*?\\end\{${env}\})\s*(?!\$)`,
      "g"
    );
    out = out.replace(re, (_m, block: string) => `\n\n$$${block.trim()}$$\n\n`);
  }
  return out;
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
  // AoPS \cent (cents) — not a KaTeX symbol
  t = t.replace(/\\cent\b/g, "\\text{¢}");

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

  t = t.replace(/\\text\s*\{\s*\\gcd\s*\}/g, "\\gcd");
  t = t.replace(/\\text\s*\{\s*\\lcm\s*\}/g, "\\operatorname{lcm}");

  t = t.replace(/\\text\s*\{([^{}]*)\}/g, (_m, inner: string) => {
    let s = inner;
    s = s.replace(/\\parallel/g, "parallel");
    s = s.replace(/\\triangle/g, "triangle");
    s = s.replace(/\\prime/g, "prime");
    s = s.replace(/\\angle/g, "angle");
    s = s.replace(/\\circ/g, "°");
    s = s.replace(/\\gcd/g, "gcd");
    s = s.replace(/\\lcm/g, "lcm");
    return `\\text{${s}}`;
  });

  return t;
}

/** Strip / unwrap centering wrappers; KaTeX display math is already centered. */
function normalizeCentering(text: string): string {
  let t = text.replace(
    /\\begin\{center\}\s*([\s\S]*?)\s*\\end\{center\}/gi,
    "\n\n$1\n\n"
  );
  t = t.replace(/\\centering\b/g, "");
  t = t.replace(/\\centerline\s*\{([^{}]*)\}/g, "\n\n$$$1$$\n\n");
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
    if (!inInline && t.startsWith("$$", i)) {
      inDisplay = !inDisplay;
      out += "$$";
      i += 2;
      continue;
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
  t = t.replace(/\\color\{[^}]+\}\s*[\w.\-]+/g, "");
  return t.trim();
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
  "left",
  "right",
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
export function normalizeLatexContent(input: string | null | undefined): string {
  if (!input) return "";
  let text = String(input);

  text = text.replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "");
  text = stripCredits(text);
  text = fixCurrencyDollars(text);
  text = fixMathrmSpacing(text);
  text = wrapBareDollarAmounts(text);
  text = normalizeCentering(text);
  text = convertChoose(text);
  text = replaceBoxed(text);
  text = wrapBareBoxed(text);
  text = wrapDisplayEnvs(text);

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
  text = repairDollarBalance(text);

  return tidyMathSpacing(text);
}

/** Wrap a short choice in $...$ when it is clearly math. */
export function normalizeChoice(choice: string | null | undefined): string {
  if (!choice) return "";
  let c = fixMathrmSpacing(
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
