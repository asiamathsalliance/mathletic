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

// Inline copy of normalize helpers (script runs without TS path aliases).
const CREDIT_LINE =
  /^(?:solution\s+by|solutions?\s+by|posted\s+by|edited\s+by|~|—|-)\s*[\w.\-]+.*$/gim;

function convertChoose(tex) {
  return tex
    .replace(/\{([^{}]+)\\choose\s*([^{}]+)\}/g, "\\binom{$1}{$2}")
    .replace(/(\d+)\s*\\choose\s*(\d+)/g, "\\binom{$1}{$2}");
}

function cleanBoxed(tex) {
  return tex.replace(/\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (_m, inner) => {
    let body = String(inner)
      .replace(/\\textbf\{\s*\(([A-E])\)\s*\}/gi, "")
      .replace(/\\text\{\s*\(([A-E])\)\s*\}/gi, "")
      .replace(/\\mathrm\{\s*\(([A-E])\)\s*\}/gi, "")
      .replace(/^\s*\(([A-E])\)\s*/i, "")
      .replace(/\\textbf\{/g, "")
      .replace(/\\text\{/g, "")
      .replace(/\\mathrm\{/g, "")
      .trim();

    const opens = (body.match(/\{/g) || []).length;
    const closes = (body.match(/\}/g) || []).length;
    if (closes > opens) {
      let extra = closes - opens;
      while (extra > 0 && body.endsWith("}")) {
        body = body.slice(0, -1);
        extra -= 1;
      }
    }
    body = body.replace(/^\{\s*/, "").replace(/\s*\}$/, "").trim();
    if (!body) return "\\boxed{?}";
    return `\\boxed{${body}}`;
  });
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
    .replace(/\s+\$/g, " $")
    .replace(/\$\s+/g, "$ ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
  text = cleanBoxed(text);
  text = wrapDisplayEnvs(text);
  text = text.replace(/(?:^|\n)\s*Remark\.?\s*\n?/gi, "\n\n**Remark.** ");
  text = text.replace(/\\qquad/g, " ");
  text = text.replace(/\\quad/g, " ");
  text = text.replace(/~/g, " ");
  text = text.replace(/([.!?])\s*(\$\\boxed\{)/g, "$1\n\n$2");
  text = tidyMathSpacing(text);
  return text;
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

// Show a couple samples
for (const id of ["amc10-2024a-1", "amc10-2024a-2", "amc12-2020a-15"]) {
  const q = out.find((x) => x.id === id);
  if (!q) continue;
  console.log(`\n=== ${id} ===`);
  console.log("Q:", q.questionText.slice(0, 120));
  console.log("S:", q.solution.slice(0, 280));
  console.log("C:", q.choices);
}

if (process.argv.includes("--import")) {
  console.log("\nRe-importing into Supabase…");
  const r = spawnSync("node", ["scripts/import-questions.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}
