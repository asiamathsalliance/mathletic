#!/usr/bin/env node
/**
 * Reclassify AMC 10/12 browse topics on the bundled bank.
 *
 * Prefer the problem stem over the solution (solutions often borrow
 * language from other topics). Writes questions-amc.json in place and
 * refreshes topic tags.
 *
 * Usage: node scripts/reclassify-amc-topics.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

const TOPICS = ["Algebra", "Geometry", "Number Theory", "Counting & Probability"];

/**
 * Score browse topics. Stem-weighted; solution is a light tie-break only.
 * Exported logic mirrored from build-amc-bank.mjs classifyTopic.
 */
export function classifyTopic(stem, solution = "") {
  const stemL = String(stem ?? "").toLowerCase();
  const solL = String(solution ?? "").toLowerCase();

  const scores = {
    Geometry: 0,
    "Number Theory": 0,
    "Counting & Probability": 0,
    Algebra: 0,
  };

  const bump = (topic, n, where = "stem") => {
    scores[topic] += where === "stem" ? n : Math.max(1, Math.round(n * 0.35));
  };

  const scan = (text, where) => {
    // --- Geometry (strong object / figure language) ---
    if (
      /\b(triangle|quadrilateral|parallelogram|rhombus|trapezoid|trapezium|hexagon|pentagon|octagon|dodecagon|polygon|tetrahedron|polyhedron|dodecahedron|cube|cuboid|sphere|cylinder|cone|pyramid|prism|rectangular box|right rectangular)\b/.test(
        text
      )
    )
      bump("Geometry", 5, where);
    if (
      /\b(circle|radius|diameter|circumference|chord|arc|sector|inscribed|circumscribed|concentric|tangent to)\b/.test(
        text
      )
    )
      bump("Geometry", 4, where);
    if (
      /\b(hypotenuse|isosceles|equilateral|scalene|right[- ]angled|right triangle|similar triangles|congruent triangles)\b/.test(
        text
      )
    )
      bump("Geometry", 4, where);
    if (
      /\b(perimeter of|area of the|surface area|volume of|altitude to|angle bisector|perpendicular bisector|midpoint of (?:the )?(?:side|segment)|coordinate plane.*(?:triangle|circle|square)|lattice (?:point|polygon))\b/.test(
        text
      )
    )
      bump("Geometry", 3, where);
    if (
      /\b(line segment|rotated|rotation|reflection|translation|swept out|inscribed in|circumscribed about|semicircle|disk of|square of side|side length|equilateral triangle|isosceles triangle)\b/.test(
        text
      )
    )
      bump("Geometry", 4, where);
    // Rolling geometry (not "cart rolls down a hill")
    if (
      /\b(?:disk|circle|sphere|coin)s?\b[^.]{0,40}\brolls?\b|\brolls?\s+(?:around|inside|outside|along|on)\b/.test(
        text
      )
    )
      bump("Geometry", 4, where);
    if (/\\triangle|\\angle|\\odot|\\perp|\\parallel|\[asy\]/.test(text))
      bump("Geometry", 3, where);
    // Weak geometry — only if not clearly algebraic "square"
    if (
      /\b(rectangle|square region|unit square|square \[|grid of squares|regular polygon|regular (?:triangle|hexagon|octagon|pentagon))\b/.test(
        text
      )
    )
      bump("Geometry", 2, where);
    if (/\b(walls?|ceiling|floor of a room|fly is in the air)\b/.test(text))
      bump("Geometry", 4, where);

    // --- Number Theory ---
    if (
      /\b(prime(?:s| number)?|composite|divisible by|positive divisors?|number of divisors|divisor(?:s)? of|divides|gcd|lcm|greatest common|least common multiple|relatively prime|coprime|pairwise relatively)\b/.test(
        text
      )
    )
      bump("Number Theory", 5, where);
    if (
      /\b(modulo|congruent modulo|remainder when|leaves a remainder|units digit|tens digit|digits? of|digit sum|base[- ]\d+|palindrome|perfect square|perfect cube|squarefree|odd positive integer|even positive integer)\b/.test(
        text
      )
    )
      bump("Number Theory", 4, where);
    if (/\\bmod\b|\\equiv|\\gcd|\\operatorname\{gcd\}|\\mathrm\{gcd\}/.test(text))
      bump("Number Theory", 3, where);
    if (
      /\b(integer(?:s)? (?:n|m|k|x|y)|positive integers?|how many positive integers|largest integer|smallest positive integer)\b/.test(
        text
      ) &&
      /\b(digit|divis|prime|remainder|mod|factor)\b/.test(text)
    )
      bump("Number Theory", 2, where);

    // --- Counting & Probability ---
    if (
      /\b(probability|randomly (?:chosen|selected|picked)|chosen at random|expected value|fair (?:coin|die|dice)|unfair (?:coin|die)|spinner)\b/.test(
        text
      )
    )
      bump("Counting & Probability", 6, where);
    if (
      /\b(how many ways|how many different|number of ways|arrangements?|permutations?|combinations?|combinat|ordered arrangements?|indistinguishable|distinguishable)\b/.test(
        text
      )
    )
      bump("Counting & Probability", 5, where);
    if (
      /\b(cards? from a|deck of|dice|coin flips?|drawn from|seated around|circular table|committee|teams? of)\b/.test(
        text
      )
    )
      bump("Counting & Probability", 3, where);
    if (/\\binom/.test(text)) bump("Counting & Probability", 4, where);
    // "how many ordered pairs" is often algebra/NT — only count if no equation/NT vibe
    if (
      /\bhow many (?:ordered )?(?:pairs|triples|integers|positive integers)\b/.test(text) &&
      !/\b(equation|satisfy|solution|polynomial|divisible|prime|remainder|perfect square|consecutive)\b/.test(
        text
      )
    )
      bump("Counting & Probability", 3, where);

    // --- Algebra ---
    if (
      /\b(polynomial|quadratic|cubic|quartic|linear equation|system of equations|solve for|absolute value|inequalit|logarithm|logarithmic|exponential function|complex number|imaginary|determinant|matrix)\b/.test(
        text
      )
    )
      bump("Algebra", 5, where);
    if (
      /\b(arithmetic sequence|geometric sequence|arithmetic progression|geometric progression|common ratio|common difference|infinite series|partial sum)\b/.test(
        text
      )
    )
      bump("Algebra", 5, where);
    if (
      /\b(function f|f\s*\(|domain of|range of|composition|inverse function|proportional|percent(?:age)?|mean|median|average of)\b/.test(
        text
      )
    )
      bump("Algebra", 3, where);
    if (
      /\b(simplify|expand|factor(?:ed|ing)?|expression|equation|roots? of the|real (?:root|number|solution)s?)\b/.test(
        text
      )
    )
      bump("Algebra", 2, where);
    if (/\\log\b|\\ln\b|\\sin\b|\\cos\b|\\tan\b|x\^[2-9]|\\frac\{[^}]*x/.test(text))
      bump("Algebra", 2, where);
  };

  scan(stemL, "stem");
  scan(solL, "sol");

  // Soft penalties for common false friends when stem is clearly another topic
  if (/\bperfect square\b/.test(stemL)) {
    scores.Geometry = Math.max(0, scores.Geometry - 3);
    scores["Number Theory"] += 2;
  }
  if (/\bdegree of (?:the )?(?:polynomial|equation)\b/.test(stemL)) {
    scores.Geometry = Math.max(0, scores.Geometry - 4);
  }
  if (/\b(geometric sequence|geometric progression|common ratio)\b/.test(stemL)) {
    scores.Geometry = Math.max(0, scores.Geometry - 5);
  }
  if (/\b(probability|randomly|fair (?:coin|die)|chosen at random)\b/.test(stemL)) {
    // geometry words in a probability stem (square region, etc.) shouldn't steal
    if (scores["Counting & Probability"] >= 5) {
      scores.Geometry = Math.min(scores.Geometry, 2);
    }
  }
  // Rolling / swept-area / segment-rotation stems stay Geometry even if solution uses algebra
  if (
    /\b(?:disk|circle|sphere)s?\b[^.]{0,40}\brolls?\b|\brolls?\s+(?:around|inside|outside)\b|\bswept out\b|\bline segment.*rotat|\brotat(?:ed|ion).*line segment\b/.test(
      stemL
    )
  ) {
    scores.Geometry += 3;
    scores["Number Theory"] = Math.min(scores["Number Theory"], Math.max(0, scores.Geometry - 1));
  }
  // Vertex/region coloring / labeling puzzles are counting, not geometry
  if (
    /\b(each (?:of the )?vertices|associated with one of the (?:digits|colors)|each digit used once|each region is to be (?:painted|colored)|colored (?:red|blue|green|white))\b/.test(
      stemL
    ) &&
    /\b(octagon|pentagon|hexagon|triangle|square|grid|polygon|center)\b/.test(stemL)
  ) {
    scores["Counting & Probability"] += 4;
  }
  // Angle arithmetic-sequence sector problems are algebra, not NT/geometry
  if (/\bcentral angles\b/.test(stemL) && /\barithmetic sequence\b/.test(stemL)) {
    scores.Algebra += 5;
    scores.Geometry = Math.min(scores.Geometry, 1);
    scores["Number Theory"] = Math.min(scores["Number Theory"], 1);
  }
  // Consecutive squares / digit problems aren't counting just because they say "how many pairs"
  if (/\b(consecutive (?:positive )?squares|perfect squares? less than|units digit)\b/.test(stemL)) {
    scores["Counting & Probability"] = Math.min(scores["Counting & Probability"], 1);
    scores["Number Theory"] += 2;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked[0][1] === 0) return "Algebra";
  // Tie: prefer non-Algebra when scores equal
  if (ranked[0][1] === ranked[1][1]) {
    const tie = ranked.filter(([, s]) => s === ranked[0][1]).map(([t]) => t);
    const pref = ["Counting & Probability", "Number Theory", "Geometry", "Algebra"];
    for (const p of pref) if (tie.includes(p)) return p;
  }
  return ranked[0][0];
}

/** Hand fixes for hybrids the keyword scorer still misses. */
const MANUAL_TOPIC = {
  "amc10-2021a-4": "Algebra", // accelerating cart — arithmetic sequence
  "amc12-2004b-24": "Geometry", // triangle + trig progression
  "amc10-2015a-24": "Geometry", // integer-sided quadrilateral
  "amc12-2015a-19": "Geometry",
  "amc12-2002b-21": "Number Theory", // divisibility cases
  "amc12-2025b-15": "Geometry", // frustum container fill
  "amc12-2007b-1": "Algebra", // bedroom wall area
  "amc10-2003b-4": "Algebra", // flower cost / area arithmetic
};

function topicTag(topic) {
  return topic.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");
}

function refreshTags(q, topic) {
  const tags = Array.isArray(q.tags) ? [...q.tags] : [];
  const drop = new Set([
    "algebra",
    "geometry",
    "number-theory",
    "counting-probability",
    "counting-&-probability",
  ]);
  const kept = tags.filter((t) => !drop.has(String(t).toLowerCase()));
  const compTag = q.competition === "AMC12" ? "amc12" : "amc10";
  if (!kept.includes(compTag)) kept.unshift(compTag);
  kept.splice(1, 0, topicTag(topic));
  // dedupe preserve order
  return [...new Set(kept)];
}

function main() {
  const path = join(root, "src/data/questions-amc.json");
  const questions = JSON.parse(readFileSync(path, "utf8"));

  const changes = [];
  const before = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  const after = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  const byComp = {
    AMC10: { before: { ...before }, after: { ...after }, changes: 0 },
    AMC12: { before: { ...before }, after: { ...after }, changes: 0 },
  };

  for (const q of questions) {
    const comp = q.competition === "AMC12" ? "AMC12" : "AMC10";
    before[q.topic] = (before[q.topic] ?? 0) + 1;
    byComp[comp].before[q.topic] = (byComp[comp].before[q.topic] ?? 0) + 1;

    const next = MANUAL_TOPIC[q.id] ?? classifyTopic(q.questionText, q.solution);
    after[next] = (after[next] ?? 0) + 1;
    byComp[comp].after[next] = (byComp[comp].after[next] ?? 0) + 1;

    if (next !== q.topic) {
      changes.push({
        id: q.id,
        from: q.topic,
        to: next,
        preview: String(q.questionText).replace(/\s+/g, " ").slice(0, 110),
      });
      byComp[comp].changes += 1;
      if (!dryRun) {
        q.topic = next;
        q.tags = refreshTags(q, next);
      }
    }
  }

  console.log(`AMC questions: ${questions.length}`);
  console.log(`Topic changes: ${changes.length}${dryRun ? " (dry-run)" : ""}`);
  console.log("\nOverall before → after:");
  for (const t of TOPICS) {
    console.log(`  ${t}: ${before[t] ?? 0} → ${after[t] ?? 0}`);
  }
  for (const comp of ["AMC10", "AMC12"]) {
    console.log(`\n${comp}: ${byComp[comp].changes} changes`);
    for (const t of TOPICS) {
      console.log(
        `  ${t}: ${byComp[comp].before[t] ?? 0} → ${byComp[comp].after[t] ?? 0}`
      );
    }
  }

  const transitions = {};
  for (const c of changes) {
    const k = `${c.from} → ${c.to}`;
    transitions[k] = (transitions[k] ?? 0) + 1;
  }
  console.log("\nTransitions:");
  for (const [k, n] of Object.entries(transitions).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${n}`);
  }

  console.log("\nSample changes (first 40):");
  for (const c of changes.slice(0, 40)) {
    console.log(`  ${c.id}: ${c.from} → ${c.to}`);
    console.log(`    ${c.preview}`);
  }

  if (!dryRun) {
    writeFileSync(path, JSON.stringify(questions, null, 2) + "\n");
    console.log(`\nWrote ${path}`);
  }
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
