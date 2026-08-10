/**
 * One-shot import of the legacy JSON question bank into Supabase.
 *
 * Usage:
 *   node scripts/import-questions.mjs
 *
 * Requires in .env.local (or the environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Safe to re-run: rows are upserted by id.
 * Runs format validation before upsert; sets verified / format_issues.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveAnswerFields,
  validateSolutionFormat,
} from "./lib/validate-question-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local */
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add them to math-exam-prep/.env.local and re-run."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const CURRICULUM_TO_COMPETITION = {
  HSC: "HSC",
  IB: "IB",
  AP: "AP",
  "A-Level": "A_LEVEL",
  "AMC 10": "AMC10",
  "AMC 12": "AMC12",
};

function mapQuestion(q) {
  const competition = q.competition ?? CURRICULUM_TO_COMPETITION[q.curriculum];
  if (!competition) throw new Error(`Unknown curriculum "${q.curriculum}" on ${q.id}`);
  const isMcq =
    Array.isArray(q.choices) &&
    q.choices.length >= 4 &&
    typeof q.correctIndex === "number";
  const isAmc = competition === "AMC10" || competition === "AMC12";
  const { ok, issues } = validateSolutionFormat(q.solution);
  const answers = deriveAnswerFields(q);
  return {
    id: q.id,
    competition,
    stream: q.stream ?? null,
    topic: q.topic,
    subtopic: q.subtopic ?? null,
    year: q.year ?? null,
    exam_source: q.examSource ?? null,
    difficulty: q.difficulty,
    amc_year: isAmc ? q.amcYear ?? q.year ?? null : null,
    amc_variant: isAmc ? q.amcVariant ?? null : null,
    problem_number: isAmc ? q.problemNumber ?? null : null,
    difficulty_bucket: isAmc ? q.difficultyBucket ?? null : null,
    question_text: q.questionText,
    image_url: q.image && q.image !== "none" ? q.image : q.questionImage ?? null,
    choices: isMcq ? q.choices : null,
    correct_index: isMcq ? q.correctIndex : null,
    solution: q.solution ?? null,
    solution_image_url: q.solutionImage ?? null,
    tags: q.tags ?? [],
    verified: ok,
    format_issues: ok ? null : issues.join("; "),
    answer_value: answers.answer_value,
    answer_type: answers.answer_type,
  };
}

const files = [
  "questions-amc.json",
  "questions-hsc.json",
  "questions-ib.json",
  "questions-ap.json",
  "questions-alevel.json",
];

const all = [];
const report = [];
for (const file of files) {
  const data = JSON.parse(readFileSync(join(root, "src/data", file), "utf8"));
  console.log(`${file}: ${data.length} questions`);
  for (const q of data) {
    const row = mapQuestion(q);
    all.push(row);
    if (!row.verified) {
      report.push({ id: row.id, file, issues: row.format_issues });
    }
  }
}

const ids = new Set();
for (const row of all) {
  if (ids.has(row.id)) throw new Error(`Duplicate id: ${row.id}`);
  ids.add(row.id);
}

const reportPath = join(root, "scripts/tmp-format-issues.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(
  `Format check: ${all.length - report.length} verified, ${report.length} failing → ${reportPath}`
);

console.log(`Upserting ${all.length} questions…`);
const CHUNK = 100;
for (let i = 0; i < all.length; i += CHUNK) {
  const chunk = all.slice(i, i + CHUNK);
  const { error } = await supabase.from("questions").upsert(chunk, { onConflict: "id" });
  if (error) {
    console.error(`Chunk ${i / CHUNK + 1} failed:`, error.message);
    process.exit(1);
  }
  console.log(`  ${Math.min(i + CHUNK, all.length)}/${all.length}`);
}

const { count, error: countError } = await supabase
  .from("questions")
  .select("*", { count: "exact", head: true });
if (countError) {
  console.error("Count check failed:", countError.message);
  process.exit(1);
}
console.log(`Done. questions table now has ${count} rows (imported ${all.length}).`);
