/**
 * Server-side typed-answer grading (never expose answer_value to the client).
 */
import { evaluate, simplify } from "mathjs";

const EPSILON = 1e-6;

function stripLatexWrappers(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\\[|\\\]/g, "")
    .trim();
}

/** Convert common LaTeX fragments into a mathjs-friendly expression. */
export function latexToMathJs(input: string): string {
  let s = stripLatexWrappers(input);
  s = s.replace(/\\dfrac\s*/g, "\\frac");
  s = s.replace(/\\tfrac\s*/g, "\\frac");
  // \frac{a}{b} → ((a)/(b))
  for (let n = 0; n < 8; n++) {
    const next = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, "(($2)^(1/($1)))");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  s = s.replace(/\\cdot/g, "*");
  s = s.replace(/\\times/g, "*");
  s = s.replace(/\\div/g, "/");
  s = s.replace(/\\pm/g, "+");
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\,/g, "");
  s = s.replace(/\\;/g, "");
  s = s.replace(/\\ /g, " ");
  s = s.replace(/[{}]/g, "");
  s = s.replace(/\^/g, "^");
  s = s.replace(/\s+/g, "");
  return s;
}

function tryEvaluate(expr: string): number | null {
  try {
    const v = evaluate(expr);
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function normalizeSymbolic(expr: string): string {
  try {
    return simplify(expr).toString().replace(/\s+/g, "");
  } catch {
    return expr.replace(/\s+/g, "");
  }
}

export type GradeVerdict = "correct" | "incorrect" | "ambiguous";

export function gradeTypedAnswer(
  studentLatex: string,
  expectedValue: string | null | undefined,
  answerType: "numeric" | "symbolic" | "expression" | null | undefined
): GradeVerdict {
  if (!expectedValue || !String(expectedValue).trim()) return "ambiguous";
  const student = latexToMathJs(studentLatex);
  const expected = latexToMathJs(expectedValue);
  if (!student || !expected) return "incorrect";

  const type = answerType ?? "expression";

  if (type === "numeric") {
    const a = tryEvaluate(student);
    const b = tryEvaluate(expected);
    if (a == null || b == null) {
      // fall through to symbolic compare
    } else if (Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(b))) {
      return "correct";
    } else {
      return "incorrect";
    }
  }

  const sa = normalizeSymbolic(student);
  const sb = normalizeSymbolic(expected);
  if (sa === sb) return "correct";

  // Difference simplifies to 0?
  try {
    const diff = simplify(`(${student})-(${expected})`).toString().replace(/\s+/g, "");
    if (diff === "0") return "correct";
  } catch {
    /* ignore */
  }

  // Numeric coincidence for expressions
  const a = tryEvaluate(student);
  const b = tryEvaluate(expected);
  if (a != null && b != null && Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(b))) {
    return "correct";
  }

  return "incorrect";
}
