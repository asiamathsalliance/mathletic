#!/usr/bin/env node
/**
 * Functional smoke checks (no browser).
 * Requires a production build (`npm run build`) unless BASE_URL is set.
 *
 *   node scripts/smoke-functionality.mjs
 *   BASE_URL=http://127.0.0.1:3000 node scripts/smoke-functionality.mjs
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { evaluate, simplify } = require("mathjs");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function latexToMathJs(input) {
  let s = String(input ?? "")
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\\[|\\\]/g, "")
    .trim();
  s = s.replace(/\\dfrac\s*/g, "\\frac").replace(/\\tfrac\s*/g, "\\frac");
  for (let n = 0; n < 8; n++) {
    const next = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
    if (next === s) break;
    s = next;
  }
  s = s
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\\left|\\right/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, "");
  return s;
}

function grade(student, expected) {
  const a = latexToMathJs(student);
  const b = latexToMathJs(expected);
  try {
    const na = Number(evaluate(a));
    const nb = Number(evaluate(b));
    if (Number.isFinite(na) && Number.isFinite(nb) && Math.abs(na - nb) <= 1e-6) {
      return "correct";
    }
  } catch {
    /* */
  }
  try {
    if (simplify(a).toString() === simplify(b).toString()) return "correct";
  } catch {
    /* */
  }
  return "incorrect";
}

ok("grade numeric equality", grade("42", "42") === "correct");
ok("grade fraction latex", grade("\\frac{1}{2}", "1/2") === "correct");
ok("grade rejects wrong", grade("3", "4") === "incorrect");

const amc = require("../src/data/questions-amc.json");
const sample = amc.find(
  (q) => Array.isArray(q.choices) && typeof q.correctIndex === "number" && q.choices[q.correctIndex]
);
ok("sample MCQ exists in bank", Boolean(sample), sample?.id ?? "none");

const expectedRaw = sample
  ? String(sample.choices[sample.correctIndex]).replace(/^\$+|\$+$/g, "").trim()
  : "";

function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

ok("QuestionCard uses MCQ choices", src("src/components/QuestionCard.tsx").includes("choices.map"));
ok("QuestionDetail uses MCQ choices", src("src/components/QuestionDetail.tsx").includes("choices.map"));
ok("Sprint ProblemPlay still MCQ", src("src/components/sprint/ProblemPlay.tsx").includes("choices.map"));
ok("sprint pool filters verified", src("src/lib/sprintProblemPool.ts").includes('.eq("verified", true)'));
ok("questions getters filter verified", src("src/lib/questions.ts").includes('.eq("verified", true)'));
ok("list path uses question summaries", src("src/lib/questions.ts").includes("getQuestionSummaries"));
ok("questionToSummary exists", src("src/lib/questionSummary.ts").includes("questionToSummary"));
ok("leaderboard reads cache", src("src/lib/leaderboard.ts").includes("leaderboard_cache"));
ok("grade route omits answer_value in JSON responses", !/answer_value\s*:/.test(src("src/app/api/grade/route.ts")));
ok("dashboard has no Recent activity feed", !src("src/app/dashboard/DashboardClient.tsx").includes("Recent activity"));
ok("dashboard keeps ActivityHeatmap", src("src/app/dashboard/DashboardClient.tsx").includes("ActivityHeatmap"));
ok(
  "century achievement uses session aggregates",
  src("src/lib/sprintAchievements.ts").includes("problems_solved") &&
    !src("src/lib/sprintAchievements.ts").includes('.from("sprint_attempts")')
);

const BASE = process.env.BASE_URL || "";
let server = null;
let base = BASE;

async function waitFor(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      /* */
    }
    await sleep(400);
  }
  return false;
}

async function httpCheck(path, opts = {}) {
  const res = await fetch(`${base}${path}`, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* */
  }
  return { res, text, json };
}

if (!base) {
  server = spawn("npm", ["run", "start", "--", "-p", "3010"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: "3010" },
  });
  base = "http://127.0.0.1:3010";
  const up = await waitFor(`${base}/browse`);
  ok("next start responds", up, base);
  if (!up) {
    server.kill("SIGTERM");
    summarize();
    process.exit(1);
  }
} else {
  ok("using existing BASE_URL", true, base);
}

for (const p of ["/", "/browse", "/leaderboard", "/sprint", "/search", "/dashboard", "/welcome"]) {
  try {
    const { res } = await httpCheck(p);
    ok(`page ${p}`, res.status < 500, `status ${res.status}`);
  } catch (e) {
    ok(`page ${p}`, false, e.message);
  }
}

// Topic / question detail pages
try {
  const { res } = await httpCheck("/amc/10/algebra");
  ok("page /amc/10/algebra", res.status < 500, `status ${res.status}`);
} catch (e) {
  ok("page /amc/10/algebra", false, e.message);
}

if (sample?.id) {
  try {
    const { res, text } = await httpCheck(`/questions/${encodeURIComponent(sample.id)}`);
    ok(`page /questions/${sample.id}`, res.status < 500, `status ${res.status}`);
    ok(
      "question detail HTML does not embed choices answer key",
      !text.includes(`"correctIndex"`) && !text.includes("answer_value"),
      "checked HTML/RSC payload markers"
    );
  } catch (e) {
    ok("question detail page", false, e.message);
  }
}

try {
  const id = sample?.id || "missing";
  const { res, json, text } = await httpCheck("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: id, studentAnswer: "THIS_IS_WRONG_99999" }),
  });
  ok("POST /api/grade (wrong)", res.status < 500, `status ${res.status}`);
  ok("wrong grade has no solution", !json?.solution, json?.verdict ?? text.slice(0, 60));
  ok("wrong grade body has no answer_value", !text.includes("answer_value"));
} catch (e) {
  ok("POST /api/grade (wrong)", false, e.message);
}

if (sample && expectedRaw) {
  try {
    const { res, json, text } = await httpCheck("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: sample.id, studentAnswer: expectedRaw }),
    });
    ok("POST /api/grade (correct)", res.status === 200, `status ${res.status}`);
    ok("correct unlocks solution", json?.verdict === "correct" && typeof json?.solution === "string");
    ok("correct response has no answer_value", !text.includes("answer_value"));
  } catch (e) {
    ok("POST /api/grade (correct)", false, e.message);
  }
}

try {
  const { res } = await httpCheck("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  ok("grade rejects missing fields", res.status === 400, `status ${res.status}`);
} catch (e) {
  ok("grade rejects missing fields", false, e.message);
}

try {
  const id = sample?.id || "x";
  const { res } = await httpCheck(`/api/solution?questionId=${encodeURIComponent(id)}`);
  ok(
    "solution locked without solved attempt",
    res.status === 401 || res.status === 403 || res.status === 503,
    `status ${res.status}`
  );
} catch (e) {
  ok("solution locked", false, e.message);
}

try {
  const { res, json } = await httpCheck("/api/questions/list?page=1&pageSize=5&includeIds=0");
  ok("GET /api/questions/list", res.status === 200, `status ${res.status}`);
  const items = json?.items ?? [];
  const leaked = items.some(
    (it) => it.correctIndex != null || it.answer_value != null || it.answerValue != null
  );
  ok("list items do not leak answer keys", !leaked, `${items.length} items`);
} catch (e) {
  ok("GET /api/questions/list", false, e.message);
}

try {
  const { res } = await httpCheck("/api/cron/leaderboard-refresh", { method: "POST" });
  ok(
    "cron refresh rejects unauthorized",
    res.status === 401 || res.status === 503,
    `status ${res.status}`
  );
} catch (e) {
  ok("cron refresh rejects unauthorized", false, e.message);
}

try {
  const { res } = await httpCheck("/api/sprint/bests");
  ok("GET /api/sprint/bests", res.status < 500, `status ${res.status}`);
} catch (e) {
  ok("GET /api/sprint/bests", false, e.message);
}

try {
  const { res } = await httpCheck("/api/search?q=algebra");
  ok("GET /api/search", res.status < 500, `status ${res.status}`);
} catch (e) {
  ok("GET /api/search", false, e.message);
}

if (server) server.kill("SIGTERM");
summarize();

function summarize() {
  const failed = results.filter((r) => !r.pass);
  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.filter((r) => r.pass).length}/${results.length}`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exitCode = 1;
  }
}
