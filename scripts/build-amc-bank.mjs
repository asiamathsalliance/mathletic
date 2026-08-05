#!/usr/bin/env node
/**
 * Build bundled AMC 10/12 question bank from AoPS-sourced public datasets.
 *
 * Sources (scraped from https://artofproblemsolving.com wiki content):
 *   - zypchn/amc2k (Hugging Face) — AMC 8/10/12 problems + solutions
 *   - greenstainedglass/amc12-full (Hugging Face) — AMC 12 2000–2025 w/ answers
 *
 * Usage:
 *   node scripts/build-amc-bank.mjs
 *
 * Writes:
 *   src/data/questions-amc.json
 *   scripts/tmp-amc/amc-import.json  (format for scripts/import-amc.mjs)
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = join(root, "scripts", "tmp-amc");
mkdirSync(tmp, { recursive: true });

const AMC2K_URL =
  "https://huggingface.co/datasets/zypchn/amc2k/resolve/main/data/test-00000-of-00001.parquet";
const AMC12_URL =
  "https://huggingface.co/datasets/greenstainedglass/amc12-full/resolve/main/amc12_dataset_full_annotated.jsonl";

const LETTERS = ["A", "B", "C", "D", "E"];

async function download(url, dest) {
  if (existsSync(dest) && (await import("node:fs")).statSync(dest).size > 1000) {
    console.log(`cached ${dest}`);
    return;
  }
  console.log(`downloading ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`  wrote ${dest} (${buf.length} bytes)`);
}

function stripAsy(text) {
  return String(text)
    .replace(/\[asy\][\s\S]*?\[\/asy\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLatex(text) {
  return stripAsy(text)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Split stem + five A–E choices from AoPS-style problem text. */
function parseChoices(problemText) {
  const text = cleanLatex(problemText);
  // Patterns seen across years:
  //   $\textbf{(A) } ... \qquad \textbf{(B) } ...$
  //   \textbf{(A)}\ ... \qquad \textbf{(B)}\ ...
  //   $\mathrm{(A) \ } ... \qquad \mathrm{(B) \ } ...$
  //   $\text{(A) } ...$
  //   \textbf{{(B)}} (typo braces)
  const marker =
    /(?:\$\s*)?\\(?:textbf|mathrm|text)\{[^{}]*\(([A-E])\)[^{}]*\}(?:\s*\$)?\s*\\?\s*/g;

  const matches = [...text.matchAll(marker)];
  if (matches.length < 5) return null;

  // Prefer the last contiguous A–E run of length 5.
  let startIdx = -1;
  for (let i = 0; i <= matches.length - 5; i++) {
    const slice = matches.slice(i, i + 5).map((m) => m[1]).join("");
    if (slice === "ABCDE") startIdx = i;
  }
  if (startIdx < 0) {
    const letters = matches.map((m) => m[1]);
    if (letters.slice(0, 5).join("") === "ABCDE") startIdx = 0;
    else return null;
  }

  const run = matches.slice(startIdx, startIdx + 5);
  const stem = text.slice(0, run[0].index).trim();
  const choices = [];
  for (let i = 0; i < 5; i++) {
    const from = run[i].index + run[i][0].length;
    const to = i < 4 ? run[i + 1].index : text.length;
    let choice = text
      .slice(from, to)
      .replace(/\\qquad/g, "")
      .replace(/\\quad/g, "")
      .replace(/\\,/g, "")
      .replace(/\\ /g, " ")
      .replace(/~/g, " ")
      .replace(/\$\s*$/g, "")
      .replace(/^\s*\$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (choice && !choice.includes("$") && /[\\^_{}]/.test(choice)) {
      choice = `$${choice}$`;
    }
    choices.push(choice || LETTERS[i]);
  }
  if (!stem || choices.some((c) => !c)) return null;
  return { stem, choices };
}

function extractAnswer(solution, fallbackAnswer) {
  if (fallbackAnswer && LETTERS.includes(String(fallbackAnswer).toUpperCase())) {
    return String(fallbackAnswer).toUpperCase();
  }
  const s = String(solution ?? "");
  const patterns = [
    /\\boxed\{\\textbf\{\(([A-E])\)/i,
    /\\boxed\{\\textbf\{([A-E])\}/i,
    /\\boxed\{\\text\{\(([A-E])\)/i,
    /\\boxed\{\(([A-E])\)/i,
    /\\boxed\{([A-E])\}/i,
    /\\textbf\{\(([A-E])\)\s*\}/i,
    /final answer is\s*\(([A-E])\)/i,
    /answer is\s*\(([A-E])\)/i,
    /correct (?:choice|answer) is\s*\(([A-E])\)/i,
  ];
  for (const pat of patterns) {
    const m = s.match(pat);
    if (m) return m[1].toUpperCase();
  }
  const boxes = [...s.matchAll(/\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)].map((m) => m[1]);
  for (const b of boxes.reverse()) {
    const m = b.match(/\(([A-E])\)/i) || (b.length < 24 ? b.match(/\b([A-E])\b/) : null);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function bucketFor(n) {
  if (n <= 10) return { bucket: "1-10", difficulty: "Easy" };
  if (n <= 20) return { bucket: "11-20", difficulty: "Medium" };
  return { bucket: "21-25", difficulty: "Hard" };
}

/**
 * Classify into browse topics used by the app:
 * Algebra | Geometry | Number Theory | Counting & Probability
 */
function classifyTopic(stem, solution = "") {
  const text = `${stem}\n${solution}`.toLowerCase();

  const scores = {
    Geometry: 0,
    "Number Theory": 0,
    "Counting & Probability": 0,
    Algebra: 0,
  };

  const bump = (topic, n = 1) => {
    scores[topic] += n;
  };

  // Geometry
  if (
    /\b(triangle|circle|radius|diameter|perimeter|polygon|quadrilateral|rectangle|square|rhombus|parallelogram|trapezoid|hexagon|pentagon|octagon|angle|degree|area of|volume|surface area|similar triangles|congruent|hypotenuse|leg|chord|arc|sector|inscribed|circumscribed|coordinate geometry|distance formula|midpoint|slope of|perpendicular|parallel lines|3d|cube|sphere|cylinder|cone|pyramid|asy\b)/i.test(
      text
    )
  )
    bump("Geometry", 3);
  if (/\\triangle|\\angle|\\odot|\\perp|\\parallel/.test(text)) bump("Geometry", 2);

  // Counting & Probability
  if (
    /\b(probability|random|expected value|combinat|permutation|how many ways|how many different|arrangements|choose|factorial|cards?|dice|coin|spinner|sequence of|ordered pairs|unordered|subset|inclusion.exclusion|binomial coefficient)/i.test(
      text
    )
  )
    bump("Counting & Probability", 3);
  if (/\\binom|\\dfrac\{1\}\{[0-9]+\}|n!|P\(|C\(/.test(text)) bump("Counting & Probability", 2);

  // Number Theory
  if (
    /\b(prime|composite|divisible|divisor|divides|gcd|lcm|modulo|congruence|remainder when|integer solutions|digits? of|units digit|base[- ]10|base[- ]2|perfect square|perfect cube|odd integer|even integer|relatively prime|coprime|factorial ends|number of positive divisors)/i.test(
      text
    )
  )
    bump("Number Theory", 3);
  if (/\\bmod\b|\\equiv|\\gcd|\\operatorname\{gcd\}/.test(text)) bump("Number Theory", 2);

  // Algebra (default-ish)
  if (
    /\b(equation|solve for|function|polynomial|quadratic|linear|system of|inequalit|absolute value|exponent|logarithm|sequence|arithmetic sequence|geometric sequence|ratio|proportion|percent|mean|median|average|expression|simplify|factor|expand|complex number|i\^|matrix|determinant)/i.test(
      text
    )
  )
    bump("Algebra", 2);
  if (/f\(|\\frac|\\sqrt|x\^|y\^/.test(text)) bump("Algebra", 1);

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0) return "Algebra";
  return ranked[0][0];
}

function parseAoPSUrl(url) {
  const u = String(url);
  // 2021_Fall_AMC_10A_Problems/Problem_13
  let m = u.match(
    /\/(\d{4})_(Fall_)?AMC_(8|10|12)([ABP]?)_Problems\/Problem_(\d+)/i
  );
  if (!m) return null;
  const year = Number(m[1]);
  const fall = Boolean(m[2]);
  const comp = m[3];
  let variant = (m[4] || "").toUpperCase() || null;
  const problemNumber = Number(m[5]);
  if (comp === "8") return null;
  // Practice test "P" — keep but mark as P via exam source; store variant as A for schema? Use null->A with id tag
  if (variant === "P") {
    return {
      competition: `AMC${comp}`,
      year,
      variant: "A",
      problemNumber,
      fall: false,
      practice: true,
      url: u,
    };
  }
  if (!variant) variant = "A"; // early years single contest → treat as A
  if (variant !== "A" && variant !== "B") return null;
  return {
    competition: `AMC${comp}`,
    year,
    variant,
    problemNumber,
    fall,
    practice: false,
    url: u,
  };
}

function makeId({ competition, year, variant, problemNumber, fall, practice }) {
  const base = competition.toLowerCase();
  if (practice) return `${base}-${year}p-${problemNumber}`;
  if (fall) return `${base}-${year}f${variant.toLowerCase()}-${problemNumber}`;
  return `${base}-${year}${variant.toLowerCase()}-${problemNumber}`;
}

function examSource({ competition, year, variant, fall, practice }) {
  const label = competition === "AMC10" ? "AMC 10" : "AMC 12";
  if (practice) return `${label} Practice ${year}`;
  if (fall) return `${label}${variant} Fall ${year}`;
  return `${label}${variant} ${year}`;
}

async function loadParquetViaPython(parquetPath) {
  // Use system python + pandas (already available in this environment).
  const { spawnSync } = await import("node:child_process");
  const outPath = join(tmp, "amc2k.jsonl");
  const py = `
import pandas as pd, json
df = pd.read_parquet(${JSON.stringify(parquetPath)})
with open(${JSON.stringify(outPath)}, "w") as f:
    for _, row in df.iterrows():
        f.write(json.dumps({"id": row["id"], "problem": row["problem"], "solution": row["solution"], "url": row["url"]}, ensure_ascii=False) + "\\n")
print("wrote", ${JSON.stringify(outPath)}, len(df))
`;
  const r = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error("Failed to convert parquet");
  }
  console.log(r.stdout.trim());
  return outPath;
}

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function upsertMap(map, key, value) {
  const prev = map.get(key);
  if (!prev) {
    map.set(key, value);
    return;
  }
  // Prefer entry with solution + answer + choices
  const score = (v) =>
    (v.solution ? 2 : 0) + (v.answer ? 2 : 0) + (v.choices?.length === 5 ? 2 : 0) + (v.stem ? 1 : 0);
  if (score(value) > score(prev)) map.set(key, { ...prev, ...value });
  else map.set(key, { ...value, ...prev, stem: prev.stem || value.stem, choices: prev.choices || value.choices, solution: prev.solution || value.solution, answer: prev.answer || value.answer });
}

async function main() {
  const parquetPath = join(tmp, "amc2k.parquet");
  const amc12Path = join(tmp, "amc12.jsonl");
  await download(AMC2K_URL, parquetPath);
  await download(AMC12_URL, amc12Path);

  const amc2kJsonl = await loadParquetViaPython(parquetPath);
  const amc2kRows = readJsonl(amc2kJsonl);
  const amc12Rows = readJsonl(amc12Path);

  /** @type {Map<string, any>} */
  const byId = new Map();
  const stats = {
    amc2kSeen: 0,
    amc2kParsed: 0,
    amc12Seen: 0,
    amc12Parsed: 0,
    choiceFail: 0,
    answerFail: 0,
    kept: 0,
  };

  for (const row of amc2kRows) {
    const meta = parseAoPSUrl(row.url);
    if (!meta) continue;
    stats.amc2kSeen += 1;
    const parsed = parseChoices(row.problem);
    if (!parsed) {
      stats.choiceFail += 1;
      continue;
    }
    const answer = extractAnswer(row.solution, null);
    if (!answer) {
      stats.answerFail += 1;
      continue;
    }
    const id = makeId(meta);
    upsertMap(byId, id, {
      id,
      ...meta,
      stem: parsed.stem,
      choices: parsed.choices,
      answer,
      solution: cleanLatex(row.solution),
      sourceUrl: row.url,
    });
    stats.amc2kParsed += 1;
  }

  for (const row of amc12Rows) {
    stats.amc12Seen += 1;
    // problem_id examples: "2000A-P1", "2019A-15", "2024B-P25"
    const m = String(row.problem_id).match(/^(\d{4})([AB])-P?(\d+)$/i);
    if (!m) continue;
    const year = Number(m[1]);
    const variant = m[2].toUpperCase();
    const problemNumber = Number(m[3]);
    const parsed = parseChoices(row.question);
    if (!parsed) {
      stats.choiceFail += 1;
      continue;
    }
    const answer = extractAnswer("", row.answer);
    if (!answer) {
      stats.answerFail += 1;
      continue;
    }
    const meta = {
      competition: "AMC12",
      year,
      variant,
      problemNumber,
      fall: false,
      practice: false,
    };
    const id = makeId(meta);
    upsertMap(byId, id, {
      id,
      ...meta,
      stem: parsed.stem,
      choices: parsed.choices,
      answer,
      solution: byId.get(id)?.solution ?? "",
      sourceUrl:
        byId.get(id)?.sourceUrl ??
        `https://artofproblemsolving.com/wiki/index.php/${year}_AMC_12${variant}_Problems/Problem_${problemNumber}`,
    });
    stats.amc12Parsed += 1;
  }

  const bank = [];
  const importRows = [];

  for (const p of byId.values()) {
    if (!p.stem || !p.choices || p.choices.length !== 5 || !p.answer) continue;
    const { bucket, difficulty } = bucketFor(p.problemNumber);
    const topic = classifyTopic(p.stem, p.solution);
    const curriculum = p.competition === "AMC10" ? "AMC 10" : "AMC 12";
    const tags = [
      p.competition.toLowerCase(),
      topic.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-"),
      `problem-${p.problemNumber}`,
      difficulty.toLowerCase(),
    ];

    bank.push({
      id: p.id,
      curriculum,
      competition: p.competition,
      topic,
      subtopic: `Problem ${p.problemNumber}`,
      year: p.year,
      examSource: examSource(p),
      difficulty,
      amcYear: p.year,
      amcVariant: p.variant,
      problemNumber: p.problemNumber,
      difficultyBucket: bucket,
      image: "none",
      questionText: p.stem,
      choices: p.choices,
      correctIndex: LETTERS.indexOf(p.answer),
      solution: p.solution || `The correct answer is (${p.answer}).`,
      tags,
    });

    importRows.push({
      competition: p.competition,
      year: p.year,
      variant: p.variant,
      problem_number: p.problemNumber,
      topic,
      subtopic: `Problem ${p.problemNumber}`,
      question_text: p.stem,
      choices: p.choices,
      answer: p.answer,
      solution: p.solution || `The correct answer is (${p.answer}).`,
      tags,
    });
    stats.kept += 1;
  }

  bank.sort((a, b) => {
    if (a.competition !== b.competition) return a.competition.localeCompare(b.competition);
    if (a.year !== b.year) return b.year - a.year;
    if (a.amcVariant !== b.amcVariant) return (a.amcVariant || "").localeCompare(b.amcVariant || "");
    return (a.problemNumber || 0) - (b.problemNumber || 0);
  });

  const outBank = join(root, "src/data/questions-amc.json");
  const outImport = join(tmp, "amc-import.json");
  writeFileSync(outBank, JSON.stringify(bank, null, 1));
  writeFileSync(outImport, JSON.stringify(importRows, null, 1));

  const byComp = Object.fromEntries(
    ["AMC10", "AMC12"].map((c) => [c, bank.filter((q) => q.competition === c).length])
  );
  const byTopic = {};
  for (const q of bank) byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
  const years = [...new Set(bank.map((q) => q.year))].sort((a, b) => a - b);

  console.log("\n=== AMC bank build complete ===");
  console.log(stats);
  console.log("by competition", byComp);
  console.log("by topic", byTopic);
  console.log("year range", years[0], "–", years[years.length - 1], `(${years.length} years)`);
  console.log(`wrote ${outBank} (${bank.length} questions)`);
  console.log(`wrote ${outImport} (for Supabase import)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
