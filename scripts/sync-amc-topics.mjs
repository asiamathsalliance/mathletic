#!/usr/bin/env node
/**
 * Push topic (+ tags) from src/data/questions-amc.json into Supabase.
 * Usage: node scripts/sync-amc-topics.mjs
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
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // rely on environment
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const questions = JSON.parse(
  readFileSync(join(root, "src/data/questions-amc.json"), "utf8")
);

const PAGE = 100;
let updated = 0;
let failed = 0;

for (let i = 0; i < questions.length; i += PAGE) {
  const batch = questions.slice(i, i + PAGE);
  const results = await Promise.all(
    batch.map(async (q) => {
      const { error } = await supabase
        .from("questions")
        .update({ topic: q.topic, tags: q.tags ?? [] })
        .eq("id", q.id);
      if (error) {
        console.error(q.id, error.message);
        return false;
      }
      return true;
    })
  );
  updated += results.filter(Boolean).length;
  failed += results.filter((ok) => !ok).length;
  process.stdout.write(`\r${Math.min(i + PAGE, questions.length)}/${questions.length}`);
}

console.log(`\nUpdated ${updated}, failed ${failed}`);
