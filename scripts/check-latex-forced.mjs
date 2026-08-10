#!/usr/bin/env node
/**
 * Forced KaTeX check for question stems + choices + solutions after normalize.
 * Run: node scripts/check-latex-forced.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const katex = require("katex");

// Inline transforms mirroring src/lib/latexNormalize.ts (no TS import in build).
function fixCurrencyDollars(text) {
  let t = text;
  t = t.replace(/\\textdollar\s*/g, "\\$");
  t = t.replace(/(?<![\\A-Za-z])textdollar\s*/gi, "\\$");
  t = t.replace(/\$\$\$\$(\d+(?:\.\d+)?)\$/g, "$\\$$$1$");
  t = t.replace(/\$\$(\d+(?:\.\d+)?)\$/g, "$\\$$$1$");
  t = t.replace(/\$\$\$\$(?=\\begin\{)/g, "$$");
  t = t.replace(/\$\$\$\$/g, "$$");
  return t;
}

function wrapBareDollarAmounts(text) {
  let t = text;
  if (/^\\text\s*\{/.test(t.trim()) && /\$\$\s*$/.test(t)) {
    t = `$${t.trim().replace(/\$\$\s*$/, "")}$`;
  }
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

function normalizeCentering(text) {
  let t = text.replace(/\\begin\{center\}\s*([\s\S]*?)\s*\\end\{center\}/gi, "\n\n$1\n\n");
  t = t.replace(/\\centering\b/g, "");
  t = t.replace(/\\centerline\s*\{([^{}]*)\}/g, "\n\n$$$1$$\n\n");
  return t;
}

function stripOrphanTrailingDollar(text) {
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

/** Lightweight normalize mirroring src/lib/latexNormalize.ts currency/center fixes. */
function normalizeLite(input) {
  if (!input) return "";
  let text = String(input);
  text = text.replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "");
  text = fixCurrencyDollars(text);
  text = wrapBareDollarAmounts(text);
  text = normalizeCentering(text);
  text = text.replace(/\\qquad/g, " ");
  text = text.replace(/\\quad/g, " ");
  text = stripOrphanTrailingDollar(text);
  text = repairDollarBalance(text);
  return text.replace(/ {2,}/g, " ").trim();
}

function normalizeChoiceLite(choice) {
  let c = wrapBareDollarAmounts(fixCurrencyDollars(String(choice ?? "").trim()));
  if (!c) return c;
  if (/^\\text\s*\{/.test(c) && !c.includes("$")) c = `$${c}$`;
  if (/^\\\$\s*\d/.test(c) && !/\$[^$]/.test(c.slice(1))) c = `$${c.replace(/\s+/g, "")}$`;
  if (c.includes("$") || /[\\^_{}]/.test(c)) return normalizeLite(c);
  if (/^[-+]?\d+(\.\d+)?$/.test(c)) return `$${c}$`;
  return c;
}

function extractMathBodies(text) {
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
    const env = text.slice(i).match(/^\\\[([\s\S]*?)\\\]/);
    if (env) {
      bodies.push({ display: true, body: env[1] });
      i += env[0].length;
      continue;
    }
    i += 1;
  }
  return bodies;
}

function checkKatex(text) {
  for (const { display, body } of extractMathBodies(text)) {
    if (!body.trim()) continue;
    try {
      katex.renderToString(body, {
        throwOnError: true,
        displayMode: display,
        strict: "ignore",
        trust: false,
        macros: { "\\textdollar": "\\$", "\\dfrac": "\\frac", "\\tfrac": "\\frac" },
      });
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }
  if (/\\textdollar|(?<![\\])textdollar|\$\$\$\$/.test(text)) {
    return "residual textdollar/$$$$ after normalize";
  }
  return null;
}

const demos = [
  String.raw`A charity sells $140$ benefit tickets for a total of $$$$2001$. Some tickets sell for full price (a whole dollar amount), and the rest sells for half price. How much money is raised by the full-price tickets?$`,
  String.raw`A charity sells $140$ benefit tickets for a total of $\textdollar 2001$. Some tickets sell for full price (a whole dollar amount), and the rest sells for half price. How much money is raised by the full-price tickets?`,
  String.raw`Pablo buys popsicles for $$1$ each and $$2$ boxes.`,
  String.raw`Ben paid $$$$12.50$ more than David.`,
];
console.log("Demo stems:");
for (const s of demos) {
  const n = normalizeLite(s);
  const err = checkKatex(n);
  console.log(err ? `  FAIL ${err}` : "  OK", "→", JSON.stringify(n).slice(0, 120));
}
console.log("Demo choices:");
for (const c of [
  "textdollar 782",
  "textdollar179.95",
  String.raw`$\textdollar 1449$`,
  String.raw`$\text{two intersecting lines}\$$`,
  String.raw`\text{5 minutes and 35 seconds}$$`,
]) {
  const n = normalizeChoiceLite(c);
  const err = checkKatex(n);
  console.log(err ? `  FAIL ${err}` : "  OK", JSON.stringify(c), "→", JSON.stringify(n));
}

const files = [
  "questions-amc.json",
  "questions-hsc.json",
  "questions-ib.json",
  "questions-ap.json",
  "questions-alevel.json",
];

const report = [];
let checked = 0;
for (const file of files) {
  const data = JSON.parse(readFileSync(join(root, "src/data", file), "utf8"));
  for (const q of data) {
    const fields = [
      ["questionText", normalizeLite(q.questionText || "")],
      ["solution", normalizeLite(q.solution || "")],
      ...((q.choices || []).map((c, i) => [`choice${i}`, normalizeChoiceLite(c)])),
    ];
    for (const [field, n] of fields) {
      if (!n) continue;
      checked += 1;
      const err = checkKatex(n);
      if (err) report.push({ id: q.id, file, field, err, sample: n.slice(0, 140) });
    }
  }
}

const outPath = join(root, "scripts/tmp-latex-forced-issues.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\nChecked ${checked} fields. Failures: ${report.length}`);
for (const row of report.slice(0, 30)) {
  console.log(` - ${row.id} ${row.field}: ${row.err}`);
}
if (report.length > 30) console.log(` … +${report.length - 30} more`);
console.log(`Wrote ${outPath}`);
