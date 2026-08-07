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
  return body.replace(/\$+$/g, "").trim();
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
    const { inner, end } = extractBalanced(text, j + "\\boxed".length);
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
      const { end } = extractBalanced(text, i + "\\boxed".length);
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

function stripCredits(text: string): string {
  let t = text.replace(
    /^(?:solution\s+by|solutions?\s+by|posted\s+by|edited\s+by|~|—|-)\s*[\w.\-]+.*$/gim,
    ""
  );
  t = t.replace(/(?:\n|^)\s*~+\s*[\w.\-]+\s*$/gim, "");
  t = t.replace(/(?:\n|^)\s*[-—]+\s*[A-Za-z][\w.\-]{2,40}\s*$/gim, "");
  t = t.replace(/\s*Solution by\s+[\w.\-]+\s*\.?\s*$/i, "");
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
  text = repairDollarBalance(text);

  return tidyMathSpacing(text);
}

/** Wrap a short choice in $...$ when it is clearly math. */
export function normalizeChoice(choice: string | null | undefined): string {
  if (!choice) return "";
  let c = String(choice).trim();
  if (!c) return c;
  if (c.includes("$")) return normalizeLatexContent(c);
  if (/^[-+]?\d+(\.\d+)?$/.test(c)) return `$${c}$`;
  if (/^[-+]?\d+\/\d+$/.test(c)) return `$${c}$`;
  if (/[\\^_{}]/.test(c) || /[≤≥≠∞π√]/.test(c) || /(?<!\\)(frac|dfrac|sqrt|binom)\b/.test(c)) {
    const fixed = restoreCommandBackslashes(c);
    return `$${fixed}$`;
  }
  return c;
}
