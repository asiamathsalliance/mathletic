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
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local loader (avoids a dotenv dependency).
function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env.local — rely on environment
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
};

function mapQuestion(q) {
  const competition = CURRICULUM_TO_COMPETITION[q.curriculum];
  if (!competition) throw new Error(`Unknown curriculum "${q.curriculum}" on ${q.id}`);
  const isMcq = Array.isArray(q.choices) && q.choices.length >= 4 && typeof q.correctIndex === "number";
  return {
    id: q.id,
    competition,
    stream: q.stream ?? null,
    topic: q.topic,
    subtopic: q.subtopic ?? null,
    year: q.year ?? null,
    exam_source: q.examSource ?? null,
    difficulty: q.difficulty,
    amc_year: null,
    amc_variant: null,
    problem_number: null,
    difficulty_bucket: null,
    question_text: q.questionText,
    image_url:
      q.image && q.image !== "none" ? q.image : q.questionImage ?? null,
    choices: isMcq ? q.choices : null,
    correct_index: isMcq ? q.correctIndex : null,
    solution: q.solution ?? null,
    solution_image_url: q.solutionImage ?? null,
    tags: q.tags ?? [],
  };
}

const files = [
  "questions-hsc.json",
  "questions-ib.json",
  "questions-ap.json",
  "questions-alevel.json",
];

const all = [];
for (const file of files) {
  const data = JSON.parse(readFileSync(join(root, "src/data", file), "utf8"));
  console.log(`${file}: ${data.length} questions`);
  all.push(...data.map(mapQuestion));
}

const ids = new Set();
for (const row of all) {
  if (ids.has(row.id)) throw new Error(`Duplicate id: ${row.id}`);
  ids.add(row.id);
}

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
console.log(
  "\nNote: once you import real AMC problems (scripts/import-amc.mjs), flip\n" +
    "DEFAULT_COMPETITIONS in src/lib/competitions.ts to ['AMC10', 'AMC12']."
);
