/**
 * Shared format validation for question solutions (import + CI).
 */

import katex from "katex";

/** Balance $ / $$ delimiters (ignore \$). Returns issue string or null. */
export function checkDollarBalance(text) {
  let i = 0;
  let inlineOpen = false;
  let displayOpen = false;
  while (i < text.length) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (text.startsWith("$$", i)) {
      if (inlineOpen) return "unclosed inline $ before $$";
      displayOpen = !displayOpen;
      i += 2;
      continue;
    }
    if (text[i] === "$") {
      if (displayOpen) return "$ inside unclosed $$";
      inlineOpen = !inlineOpen;
      i += 1;
      continue;
    }
    i += 1;
  }
  if (displayOpen) return "unclosed $$ display math";
  if (inlineOpen) return "unclosed $ inline math";
  return null;
}

/** Basic markdown fence / bold balance checks. */
export function checkMarkdownBalance(text) {
  const fences = (text.match(/```/g) || []).length;
  if (fences % 2 !== 0) return "unclosed markdown code fence ```";
  // Odd count of ** often means unclosed bold (ignore inside $...$).
  let stripped = text;
  stripped = stripped.replace(/\$\$[\s\S]*?\$\$/g, " ");
  stripped = stripped.replace(/\$[^$]*\$/g, " ");
  const stars = (stripped.match(/\*\*/g) || []).length;
  if (stars % 2 !== 0) return "unclosed markdown bold **";
  return null;
}

/** Extract math bodies for KaTeX render checks. */
export function extractMathBodies(text) {
  const bodies = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (text.startsWith("$$", i)) {
      const end = text.indexOf("$$", i + 2);
      if (end < 0) break;
      bodies.push({ display: true, body: text.slice(i + 2, end) });
      i = end + 2;
      continue;
    }
    if (text[i] === "$") {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text[j] === "$") break;
        j += 1;
      }
      if (j >= text.length) break;
      bodies.push({ display: false, body: text.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    // bare \begin{align*}...\end{align*}
    const env = text.slice(i).match(/^\\begin\{(align|equation|gather)\*?\}/);
    if (env) {
      const name = env[1];
      const close = `\\end{${env[0].includes("*") ? name + "*" : name}}`;
      // simpler: find matching end
      const endRe = new RegExp(`\\\\end\\{${name}\\*?\\}`);
      const rest = text.slice(i);
      const m = rest.match(
        new RegExp(`^\\\\begin\\{${name}\\*?\\}[\\s\\S]*?\\\\end\\{${name}\\*?\\}`)
      );
      if (m) {
        bodies.push({ display: true, body: m[0] });
        i += m[0].length;
        continue;
      }
    }
    i += 1;
  }
  return bodies;
}

export function checkKatexRenders(text) {
  const bodies = extractMathBodies(text);
  for (const { display, body } of bodies) {
    if (!body.trim()) continue;
    try {
      katex.renderToString(body, {
        throwOnError: true,
        displayMode: display,
        strict: "ignore",
        trust: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `KaTeX error: ${msg.slice(0, 160)}`;
    }
  }
  return null;
}

/**
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function validateSolutionFormat(solution) {
  const issues = [];
  const s = solution == null ? "" : String(solution);
  if (!s.trim()) {
    issues.push("empty solution");
    return { ok: false, issues };
  }
  const dollar = checkDollarBalance(s);
  if (dollar) issues.push(dollar);
  const md = checkMarkdownBalance(s);
  if (md) issues.push(md);
  // Only run KaTeX if delimiters look balanced (otherwise noise).
  if (!dollar) {
    const katexIssue = checkKatexRenders(s);
    if (katexIssue) issues.push(katexIssue);
  }
  return { ok: issues.length === 0, issues };
}

/** Derive typed-answer fields from legacy MCQ / long-answer JSON. */
export function deriveAnswerFields(q) {
  const isMcq =
    Array.isArray(q.choices) &&
    q.choices.length >= 4 &&
    typeof q.correctIndex === "number" &&
    q.choices[q.correctIndex] != null;

  if (isMcq) {
    const raw = String(q.choices[q.correctIndex]).trim();
    const latex = raw.replace(/^\$+|\$+$/g, "").trim();
    const numericPlain = latex
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
      .replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
      .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\cdot/g, "*")
      .replace(/\\times/g, "*")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, "");
    const isNumeric = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(numericPlain);
    const isSimpleFrac = /^-?\d+\/\d+$/.test(numericPlain);
    return {
      answer_value: latex || raw,
      answer_type: isNumeric || isSimpleFrac ? "numeric" : "expression",
    };
  }

  // Long-answer: no authoritative answer_value yet — mark expression, leave null
  // so grading falls back to AI check.
  return { answer_value: null, answer_type: "expression" };
}
