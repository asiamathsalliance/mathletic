#!/usr/bin/env node
/**
 * Repair AoPS solutions that end with `\boxed{?}` (answer letter stripped).
 * Prefer recovering a trailing numeric value (`\boxed{?}450}` → `\boxed{450}`);
 * otherwise fill from the correct choice / letter.
 *
 * Usage: node scripts/fix-amc-boxed-placeholders.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const LETTERS = ["A", "B", "C", "D", "E"];

function repairNumericPlaceholders(solution) {
  let s = solution;
  // `\boxed{?}450}` / `\boxed{?} 8}`
  s = s.replace(/\\boxed\{\s*\?\s*\}\s*(-?\d+(?:\.\d+)?)\s*\}/g, "\\boxed{$1}");
  // `\boxed{?}450}$` (brace already consumed by outer math)
  s = s.replace(/\\boxed\{\s*\?\s*\}\s*(-?\d+(?:\.\d+)?)(?=\s*\$)/g, "\\boxed{$1}");
  // `\mathrm{\boxed{?}11}` leftovers
  s = s.replace(/\\(?:mathrm|mathbf|textbf)\s*\{\s*\\boxed\{/g, "\\boxed{");
  return s;
}

function choiceBody(choice) {
  let body = String(choice ?? "").trim();
  // Odd AoPS choice prefixes
  body = body.replace(/^[:;]\s*/, "");
  if (body.startsWith("$") && body.endsWith("$") && body.length > 2) {
    body = body.slice(1, -1).trim();
  }
  // Strip leading choice markers if present
  body = body.replace(/^\(?[A-E]\)?\s*/i, "").trim();
  // `\dfrac{a}2` → `\dfrac{a}{2}` so `\boxed{…}` doesn't close early
  body = body.replace(/\\dfrac\{([^{}]+)\}(\d+)/g, "\\dfrac{$1}{$2}");
  body = body.replace(/\\tfrac\{([^{}]+)\}(\d+)/g, "\\tfrac{$1}{$2}");
  body = body.replace(/\\frac\{([^{}]+)\}(\d+)/g, "\\frac{$1}{$2}");
  return body;
}

function boxedFromChoice(q) {
  const idx = q.correctIndex;
  if (typeof idx !== "number" || !Array.isArray(q.choices) || !q.choices[idx]) {
    return null;
  }
  const letter = LETTERS[idx];
  const body = choiceBody(q.choices[idx]);
  if (!body) return `\\boxed{(${letter})}`;

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  // Prose / long answer choices → letter. Avoid nested `$…$` inside `\boxed`.
  if (wordCount > 4 || (body.includes("$") && wordCount > 2)) {
    return `\\boxed{(${letter})}`;
  }
  return `\\boxed{${body}}`;
}

function fixSolution(q) {
  let s = String(q.solution ?? "");
  if (!s.includes("\\boxed{?}") && !/\\boxed\{\s*\?/.test(s)) return null;

  const before = s;
  s = repairNumericPlaceholders(s);

  if (/\\boxed\{\s*\?/.test(s)) {
    const fill = boxedFromChoice(q);
    if (fill) {
      s = s.replace(/\\boxed\{\s*\?[^{}]*\}/g, fill);
    }
  }

  return s !== before ? s : null;
}

const path = join(root, "src/data/questions-amc.json");
const questions = JSON.parse(readFileSync(path, "utf8"));

let changed = 0;
const samples = [];
for (const q of questions) {
  const next = fixSolution(q);
  if (!next) continue;
  changed += 1;
  if (samples.length < 20) {
    samples.push({
      id: q.id,
      from: String(q.solution).match(/\\boxed\{[^}]{0,40}\}/)?.[0],
      to: next.match(/\\boxed\{[^}]{0,80}\}/g)?.slice(-1)?.[0],
    });
  }
  if (!dryRun) q.solution = next;
}

console.log(`${dryRun ? "Would fix" : "Fixed"} ${changed} solutions`);
for (const s of samples) {
  console.log(`  ${s.id}: ${s.from} → ${s.to}`);
}

const still = questions.filter((q) => /\\boxed\{\s*\?/.test(String(q.solution ?? ""))).length;
console.log(`Remaining \\boxed{?}: ${still}`);

if (!dryRun) {
  writeFileSync(path, JSON.stringify(questions, null, 2) + "\n");
  console.log(`Wrote ${path}`);
}
