#!/usr/bin/env node
/**
 * CI / local: report format / KaTeX errors in bundled question solutions.
 *
 *   npm run check:solutions
 *   STRICT_SOLUTIONS=1 npm run check:solutions   # fail CI when any issue remains
 *
 * Failing solutions are marked verified=false on import and excluded from serving.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSolutionFormat } from "./lib/validate-question-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "questions-amc.json",
  "questions-hsc.json",
  "questions-ib.json",
  "questions-ap.json",
  "questions-alevel.json",
];

let failed = 0;
const report = [];

for (const file of files) {
  const data = JSON.parse(readFileSync(join(root, "src/data", file), "utf8"));
  for (const q of data) {
    const { ok, issues } = validateSolutionFormat(q.solution);
    if (!ok) {
      failed += 1;
      report.push({ id: q.id, file, issues });
    }
  }
}

const outDir = join(root, "scripts");
mkdirSync(outDir, { recursive: true });
const reportPath = join(outDir, "tmp-format-issues.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (failed > 0) {
  console.error(`Solution format check: ${failed} question(s) have issues.`);
  for (const row of report.slice(0, 40)) {
    console.error(`  - ${row.id}: ${row.issues.join("; ")}`);
  }
  if (failed > 40) console.error(`  … and ${failed - 40} more`);
  console.error(`Wrote checklist → ${reportPath}`);
  console.error("Import marks these verified=false; they are excluded from serving.");

  if (process.env.STRICT_SOLUTIONS === "1") {
    process.exit(1);
  }
  process.exit(0);
}

console.log("Solution format check passed (all solutions valid).");
