import katex from "katex";
import { readFileSync } from "node:fs";
import { normalizeChoice, normalizeLatexContent } from "../src/lib/latexNormalize.ts";

function extractMathBodies(text: string) {
  const bodies: { display: boolean; body: string }[] = [];
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
    i += 1;
  }
  return bodies;
}

function check(text: string) {
  for (const { display, body } of extractMathBodies(text)) {
    if (!body.trim()) continue;
    katex.renderToString(body, {
      throwOnError: true,
      displayMode: display,
      strict: "ignore",
      macros: { "\\textdollar": "\\$", "\\dfrac": "\\frac", "\\tfrac": "\\frac" },
    });
  }
  if (/\\textdollar|(?<![\\])textdollar|\$\$\$\$/.test(text)) {
    throw new Error("residual textdollar/$$$$");
  }
}

const charity = String.raw`A charity sells $140$ benefit tickets for a total of $$$$2001$. Some tickets sell for full price (a whole dollar amount), and the rest sells for half price. How much money is raised by the full-price tickets?$`;
const n = normalizeLatexContent(charity);
check(n);
console.log("TS charity OK:", n);

for (const c of ["textdollar 782", String.raw`$\textdollar 1449$`, "textdollar179.95"]) {
  const nc = normalizeChoice(c);
  check(nc);
  console.log("TS choice OK:", c, "→", nc);
}

let failed = 0;
const data = JSON.parse(readFileSync(new URL("../src/data/questions-amc.json", import.meta.url), "utf8"));
for (const q of data) {
  try {
    check(normalizeLatexContent(q.questionText || ""));
    for (const c of q.choices || []) check(normalizeChoice(c));
  } catch (e) {
    failed += 1;
    if (failed <= 15) console.log("TS FAIL", q.id, (e as Error).message.slice(0, 100));
  }
}
console.log(`TS AMC stem+choice failures: ${failed}/${data.length}`);
