/**
 * Import AMC 10/12 problems from a JSON file into Supabase.
 *
 * Usage:
 *   node scripts/import-amc.mjs path/to/amc-problems.json
 *
 * Requires in .env.local (or the environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Expected JSON format — an array of objects like:
 * [
 *   {
 *     "competition": "AMC10",            // "AMC10" or "AMC12"
 *     "year": 2023,                       // AMC year
 *     "variant": "A",                     // "A" or "B"
 *     "problem_number": 14,               // 1–25
 *     "topic": "Algebra",                 // display topic
 *     "question_text": "What is $2+2$?",  // LaTeX with $...$ allowed
 *     "choices": ["$1$", "$2$", "$3$", "$4$", "$5$"],  // exactly 5 (A–E)
 *     "answer": "D",                      // letter A–E
 *     "solution": "Add: $2+2=4$.",        // optional
 *     "image_url": null,                  // optional
 *     "tags": ["arithmetic"]              // optional
 *   }
 * ]
 *
 * Derived automatically:
 *   id                — e.g. "amc10-2023a-14"
 *   difficulty_bucket — "1-10" | "11-20" | "21-25" from problem_number
 *   difficulty        — Easy (1–10), Medium (11–20), Hard (21–25)
 *
 * Safe to re-run: rows are upserted by id.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-amc.mjs path/to/amc-problems.json");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const LETTERS = ["A", "B", "C", "D", "E"];

function bucketFor(problemNumber) {
  if (problemNumber <= 10) return { bucket: "1-10", difficulty: "Easy" };
  if (problemNumber <= 20) return { bucket: "11-20", difficulty: "Medium" };
  return { bucket: "21-25", difficulty: "Hard" };
}

function validateAndMap(p, index) {
  const where = `problem ${index} (${p.competition ?? "?"} ${p.year ?? "?"}${p.variant ?? "?"} #${p.problem_number ?? "?"})`;

  if (p.competition !== "AMC10" && p.competition !== "AMC12")
    throw new Error(`${where}: competition must be "AMC10" or "AMC12"`);
  if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2100)
    throw new Error(`${where}: year must be an integer`);
  if (p.variant !== "A" && p.variant !== "B")
    throw new Error(`${where}: variant must be "A" or "B"`);
  if (!Number.isInteger(p.problem_number) || p.problem_number < 1 || p.problem_number > 25)
    throw new Error(`${where}: problem_number must be 1–25`);
  if (!Array.isArray(p.choices) || p.choices.length !== 5)
    throw new Error(`${where}: choices must be exactly 5 items (A–E)`);
  if (!LETTERS.includes(p.answer))
    throw new Error(`${where}: answer must be a letter A–E`);
  if (typeof p.question_text !== "string" || !p.question_text.trim())
    throw new Error(`${where}: question_text is required`);
  if (typeof p.topic !== "string" || !p.topic.trim())
    throw new Error(`${where}: topic is required`);

  const { bucket, difficulty } = bucketFor(p.problem_number);
  const id = `${p.competition.toLowerCase()}-${p.year}${p.variant.toLowerCase()}-${p.problem_number}`;

  return {
    id,
    competition: p.competition,
    stream: null,
    topic: p.topic,
    subtopic: p.subtopic ?? null,
    year: p.year,
    exam_source: `${p.competition === "AMC10" ? "AMC 10" : "AMC 12"}${p.variant} ${p.year}`,
    difficulty,
    amc_year: p.year,
    amc_variant: p.variant,
    problem_number: p.problem_number,
    difficulty_bucket: bucket,
    question_text: p.question_text,
    image_url: p.image_url ?? null,
    choices: p.choices,
    correct_index: LETTERS.indexOf(p.answer),
    solution: p.solution ?? null,
    solution_image_url: p.solution_image_url ?? null,
    tags: p.tags ?? [],
  };
}

const problems = JSON.parse(readFileSync(inputPath, "utf8"));
if (!Array.isArray(problems)) {
  console.error("Input JSON must be an array of problems.");
  process.exit(1);
}

const rows = problems.map(validateAndMap);
const ids = new Set();
for (const row of rows) {
  if (ids.has(row.id)) throw new Error(`Duplicate problem: ${row.id}`);
  ids.add(row.id);
}

console.log(`Upserting ${rows.length} AMC problems…`);
const CHUNK = 100;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const { error } = await supabase.from("questions").upsert(chunk, { onConflict: "id" });
  if (error) {
    console.error(`Chunk ${i / CHUNK + 1} failed:`, error.message);
    process.exit(1);
  }
  console.log(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
}

const { count } = await supabase
  .from("questions")
  .select("*", { count: "exact", head: true })
  .in("competition", ["AMC10", "AMC12"]);
console.log(`Done. ${count ?? "?"} AMC rows now in the questions table.`);
console.log(
  "\nReminder: flip DEFAULT_COMPETITIONS in src/lib/competitions.ts to\n" +
    "['AMC10', 'AMC12'] so the home list defaults to AMC problems."
);
