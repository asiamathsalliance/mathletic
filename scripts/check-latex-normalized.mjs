#!/usr/bin/env node
/**
 * KaTeX check after the same normalizeLatexContent used in the UI (LatexText).
 *
 *   npm run check:latex:normalized
 *   FIRST_N=200 npm run check:latex:normalized
 *   STRICT_LATEX=1 npm run check:latex:normalized
 *
 * Uses Node's TypeScript strip-types to import src/lib/latexNormalize.ts directly
 * so the checker never drifts from render-time normalization.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const katex = require("katex");

const firstN = process.env.FIRST_N ? Number(process.env.FIRST_N) : null;
const strict = process.env.STRICT_LATEX === "1";

// Load TS normalizer via a short strip-types worker (keeps this file plain ESM).
const loader = `
import { normalizeLatexContent, normalizeChoice } from ${JSON.stringify(
  pathToFileURL(join(root, "src/lib/latexNormalize.ts")).href
)};
import { readFileSync } from "node:fs";
const payload = JSON.parse(readFileSync(0, "utf8"));
const out = payload.map((row) => ({
  id: row.id,
  questionText: normalizeLatexContent(row.questionText),
  solution: normalizeLatexContent(row.solution),
  choices: (row.choices || []).map((c) => normalizeChoice(c)),
}));
process.stdout.write(JSON.stringify(out));
`;

function normalizeBatch(rows) {
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", loader],
    {
      input: JSON.stringify(rows),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      cwd: root,
    }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  return JSON.parse(r.stdout);
}

/** Mirror LatexText.tsx delimiter scanning after normalize. */
function checkLikeLatexText(source) {
  const issues = [];
  let remaining = String(source ?? "");
  const macros = {
    "\\dfrac": "\\frac",
    "\\tfrac": "\\frac",
    "\\textdollar": "\\$",
    "\\cent": "\\text{c}",
  };
  const render = (latex, display) => {
    try {
      katex.renderToString(latex.trim(), {
        throwOnError: true,
        displayMode: display,
        strict: "ignore",
        trust: false,
        macros,
      });
    } catch (err) {
      issues.push(err instanceof Error ? err.message.slice(0, 160) : String(err));
    }
  };

  while (remaining.length > 0) {
    const displayDouble = remaining.match(/^\$\$([\s\S]*?)\$\$/);
    const displayBracket = remaining.match(/^\\\[\s*([\s\S]*?)\s*\\\]/);
    const displayMatch = displayDouble ?? displayBracket;
    if (displayMatch) {
      if (displayMatch[1].trim() && /(?<!\\)\$/.test(displayMatch[1])) {
        issues.push("raw $ inside display");
      } else if (displayMatch[1].trim()) {
        render(displayMatch[1], true);
      }
      remaining = remaining.slice(displayMatch[0].length);
      continue;
    }

    const envMatch = remaining.match(
      /^(\\begin\{(?:align|equation|gather|multline|eqnarray|alignat)\*?\}[\s\S]*?\\end\{(?:align|equation|gather|multline|eqnarray|alignat)\*?\})/
    );
    if (envMatch) {
      if (/(?<!\\)\$/.test(envMatch[1])) issues.push("raw $ inside display env");
      else render(envMatch[1], true);
      remaining = remaining.slice(envMatch[0].length);
      continue;
    }

    let inlineDollar = remaining.match(/^\$((?:\\.|[^$\\])*?)\$/);
    if (
      inlineDollar &&
      /\\\[|\\begin\{(?:align|equation|gather|multline|eqnarray|alignat)/.test(
        inlineDollar[1]
      )
    ) {
      inlineDollar = null;
    }
    const inlineParen = remaining.match(/^\\\(\s*([\s\S]*?)\s*\\\)/);
    const inlineMatch = inlineDollar ?? inlineParen;
    if (inlineMatch) {
      if (inlineMatch[1].trim()) render(inlineMatch[1], false);
      remaining = remaining.slice(inlineMatch[0].length);
      continue;
    }

    const candidates = [
      remaining.indexOf("$"),
      remaining.indexOf("\\("),
      remaining.indexOf("\\["),
      remaining.search(/\\begin\{(?:align|equation|gather|multline|eqnarray|alignat)\*?\}/),
    ].filter((i) => i >= 0);
    const next = candidates.length ? Math.min(...candidates) : -1;
    if (next === -1) break;
    if (next === 0) {
      remaining = remaining.slice(1);
      continue;
    }
    remaining = remaining.slice(next);
  }
  return issues;
}

const demos = [
  {
    id: "demo-user-boxed-bracket",
    questionText: "",
    choices: [],
    solution: String.raw`Therefore, the answer is \[s = \frac{\sqrt2}{\sqrt2 + 1}\cdot\frac{\sqrt2 - 1}{\sqrt2 - 1} = \boxed{2 - \sqrt{2}.\]}`,
  },
  {
    id: "demo-truncated-boxed",
    questionText: "",
    choices: [],
    solution: String.raw`Evaluating this gives you the answer of $\boxed{\frac{7}{54}$.`,
  },
  {
    id: "demo-letter-junk",
    questionText: "",
    choices: [],
    solution: String.raw`bucket $\boxed{D} D}$.`,
  },
  {
    id: "demo-inline-before-display",
    questionText: "",
    choices: [],
    solution: String.raw`$x+40. We have \[6x=96,\] from which $x=7$`,
  },
];

const files = [
  "questions-amc.json",
  "questions-hsc.json",
  "questions-ib.json",
  "questions-ap.json",
  "questions-alevel.json",
];

const report = [];
let checked = 0;

console.log("Demo edge cases:");
{
  const normalized = normalizeBatch(demos);
  for (const row of normalized) {
    const issues = checkLikeLatexText(row.solution);
    checked += 1;
    if (issues.length) {
      report.push({ id: row.id, file: "demo", field: "solution", issues });
      console.log(`  FAIL ${row.id}: ${issues[0]}`);
    } else {
      console.log(`  OK   ${row.id}`);
    }
  }
}

for (const file of files) {
  let data = JSON.parse(readFileSync(join(root, "src/data", file), "utf8"));
  if (file === "questions-amc.json" && firstN != null && Number.isFinite(firstN)) {
    data = data.slice(0, firstN);
  }
  // Batch normalize in chunks to keep worker memory bounded.
  const chunkSize = 100;
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.slice(offset, offset + chunkSize);
    const normalized = normalizeBatch(chunk);
    for (const row of normalized) {
      const fields = [
        ["questionText", row.questionText],
        ["solution", row.solution],
        ...row.choices.map((c, i) => [`choice${i}`, c]),
      ];
      for (const [field, value] of fields) {
        if (!value) continue;
        checked += 1;
        const issues = checkLikeLatexText(value);
        if (issues.length) {
          report.push({ id: row.id, file, field, issues, sample: String(value).slice(0, 160) });
        }
      }
    }
  }
}

const outDir = join(root, "scripts");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "tmp-latex-normalized-issues.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

const scope =
  firstN != null && Number.isFinite(firstN)
    ? `first ${firstN} AMC + other curricula`
    : "full bank";
console.log(`\nChecked ${checked} fields (${scope}). Failures: ${report.length}`);
for (const row of report.slice(0, 40)) {
  console.log(` - ${row.id} ${row.field}: ${row.issues[0]}`);
}
if (report.length > 40) console.log(` … +${report.length - 40} more`);
console.log(`Wrote ${outPath}`);

if (report.length > 0 && strict) process.exit(1);
if (report.some((r) => r.file === "demo")) process.exit(1);
if (firstN != null && report.some((r) => r.file === "questions-amc.json")) {
  // First-N AMC slice must be clean when FIRST_N is set.
  process.exit(1);
}
