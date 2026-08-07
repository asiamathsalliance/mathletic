#!/usr/bin/env node
/**
 * Normalize LaTeX in src/data/questions-amc.json (and optionally re-import).
 *
 *   node scripts/normalize-amc-latex.mjs
 *   node scripts/normalize-amc-latex.mjs --import
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function extractBalanced(s, start) {
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

function convertChoose(tex) {
  return tex
    .replace(/\{([^{}]+)\\choose\s*([^{}]+)\}/g, "\\binom{$1}{$2}")
    .replace(/(\d+)\s*\\choose\s*(\d+)/g, "\\binom{$1}{$2}");
}

function cleanBoxedBody(inner) {
  let body = String(inner)
    .replace(/\\textbf\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\text\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/\\mathrm\s*\{\s*\(([A-E])\)\s*\}/gi, "")
    .replace(/^\s*\(([A-E])\)\s*/i, "");

  while (true) {
    const m = body.match(/\\(?:textbf|text|mathrm)\s*\{/);
    if (!m || m.index === undefined) break;
    const openAt = m.index + m[0].length - 1;
    const { inner: unwrapped, end } = extractBalanced(body, openAt);
    body = body.slice(0, m.index) + unwrapped + body.slice(end);
  }

  body = body.replace(/[.,;:]+$/g, "").trim();
  return body.replace(/\$+$/g, "").trim();
}

function replaceBoxed(text) {
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

function wrapBareBoxed(text) {
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
    if (!inInline && !inDisplay && text.startsWith("\\boxed{", i)) {
      const { end } = extractBalanced(text, i + "\\boxed".length);
      let j = end;
      if (text[j] === "$") j += 1;
      out += `$${text.slice(i, end)}$`;
      i = j;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function repairDollarBalance(text) {
  let dollars = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "$") dollars += 1;
  }
  if (dollars % 2 === 1) {
    const trimmed = text.replace(/\s+$/, "");
    return `${trimmed}$`;
  }
  return text;
}

function wrapDisplayEnvs(text) {
  const envs = ["align\\*?", "equation\\*?", "gather\\*?", "multline\\*?", "eqnarray\\*?"];
  let out = text;
  for (const env of envs) {
    const re = new RegExp(
      `(?<!\\$)\\s*(\\\\begin\\{${env}\\}[\\s\\S]*?\\\\end\\{${env}\\})\\s*(?!\\$)`,
      "g"
    );
    out = out.replace(re, (_m, block) => `\n\n$$${block.trim()}$$\n\n`);
  }
  return out;
}

function tidyMathSpacing(text) {
  return text
    .replace(/\$\s+([.,;:!?])/g, "$$1")
    .replace(/([(\[])\s+\$/g, "$1$")
    .replace(/\$\s+([)\]])/g, "$$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

const CREDIT_LINE =
  /^(?:solution\s+by|solutions?\s+by|posted\s+by|edited\s+by|~|—|-)\s*[\w.\-]+.*$/gim;

function stripCredits(text) {
  let t = text.replace(CREDIT_LINE, "");
  t = t.replace(/(?:\n|^)\s*~+\s*[\w.\-]+\s*$/gim, "");
  t = t.replace(/(?:\n|^)\s*[-—]+\s*[A-Za-z][\w.\-]{2,40}\s*$/gim, "");
  t = t.replace(/\s*Solution by\s+[\w.\-]+\s*\.?\s*$/i, "");
  t = t.replace(/(?:\n|^)\s*(?:~+|-+)?\s*[A-Za-z][\w.\-]{2,30}\s*$/g, "");
  return t.trim();
}

function normalizeLatexContent(input) {
  if (!input) return "";
  let text = String(input);
  text = text.replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "");
  text = stripCredits(text);
  text = convertChoose(text);
  text = replaceBoxed(text);
  text = wrapBareBoxed(text);
  text = wrapDisplayEnvs(text);
  text = text.replace(/\$?\\textbf\s*\{\s*\(([A-E])\)\s*\}\\?\$?/g, "($1)");
  text = text.replace(/\\textbf\s*\{\s*\(([A-E])\)\s*\}/g, "($1)");
  text = text.replace(/(?:^|\n)\s*Remark\.?\s*\n?/gi, "\n\n**Remark.** ");
  text = text.replace(/\\qquad/g, " ");
  text = text.replace(/\\quad/g, " ");
  text = text.replace(/~/g, " ");
  text = text.replace(/([.!?])\s*(\$\\boxed\{)/g, "$1\n\n$2");
  text = repairDollarBalance(text);
  return tidyMathSpacing(text);
}

function normalizeChoice(choice) {
  if (!choice) return "";
  let c = String(choice).trim();
  if (!c) return c;
  if (c.includes("$")) return normalizeLatexContent(c);
  if (/^[-+]?\d+(\.\d+)?$/.test(c)) return `$${c}$`;
  if (/^[-+]?\d+\/\d+$/.test(c)) return `$${c}$`;
  if (/[\\^_{}]/.test(c) || /[≤≥≠∞π√]/.test(c)) return `$${c}$`;
  return c;
}

function normalizeQuestion(q) {
  const next = { ...q };
  next.questionText = normalizeLatexContent(q.questionText);
  next.solution = normalizeLatexContent(q.solution);
  if (Array.isArray(q.choices)) {
    next.choices = q.choices.map(normalizeChoice);
  }
  return next;
}

const path = join(root, "src/data/questions-amc.json");
const questions = JSON.parse(readFileSync(path, "utf8"));
console.log(`Normalizing ${questions.length} AMC questions…`);

let changed = 0;
const out = questions.map((q) => {
  const n = normalizeQuestion(q);
  if (
    n.questionText !== q.questionText ||
    n.solution !== q.solution ||
    JSON.stringify(n.choices) !== JSON.stringify(q.choices)
  ) {
    changed += 1;
  }
  return n;
});

writeFileSync(path, JSON.stringify(out, null, 1));
console.log(`Updated ${changed}/${questions.length} questions → ${path}`);

for (const id of ["amc10-2024a-16", "amc10-2023a-2", "amc10-2023b-3", "amc12-2023a-10"]) {
  const q = out.find((x) => x.id === id);
  if (!q) continue;
  console.log(`\n=== ${id} ===`);
  console.log("S:", q.solution.slice(-200));
}

if (process.argv.includes("--import")) {
  console.log("\nRe-importing into Supabase…");
  const r = spawnSync("node", ["scripts/import-questions.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}
