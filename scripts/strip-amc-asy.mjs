#!/usr/bin/env node
/**
 * Strip Asymptote diagram fences/tags from AMC question stems & solutions.
 * Usage: node scripts/strip-amc-asy.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

function stripAsy(text) {
  let t = String(text ?? "");
  t = t.replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "");
  t = t.replace(/```(?:asy|asymptote)[^\n]*\n[\s\S]*?```/gi, "");
  t = t.replace(
    /```\s*\n(?:\s*(?:unitsize|import\s+graph|pair\s+[A-Z]\s*=)[\s\S]*?)```/gi,
    ""
  );
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

const path = join(root, "src/data/questions-amc.json");
const questions = JSON.parse(readFileSync(path, "utf8"));

let changed = 0;
const ids = [];
for (const q of questions) {
  let touched = false;
  for (const field of ["questionText", "solution"]) {
    const before = q[field] ?? "";
    const after = stripAsy(before);
    if (after !== before) {
      if (!dryRun) q[field] = after;
      touched = true;
    }
  }
  if (touched) {
    changed += 1;
    if (ids.length < 30) ids.push(q.id);
  }
}

console.log(`${dryRun ? "Would clean" : "Cleaned"} ${changed} questions`);
console.log("Sample:", ids.join(", "));

if (!dryRun) {
  writeFileSync(path, JSON.stringify(questions, null, 2) + "\n");
  console.log(`Wrote ${path}`);
}
