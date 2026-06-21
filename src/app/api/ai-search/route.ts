import { NextRequest } from "next/server";
import { chatWithDeepseek } from "@/lib/localLlm";
import type { Curriculum, Difficulty } from "@/types/question";

const TOPICS = [
  "Algebra",
  "Functions",
  "Calculus",
  "Trigonometry",
  "Probability",
  "Vectors",
] as const;

const CURRICULA: Curriculum[] = ["HSC", "IB", "AP"];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

import type { AISearchFilters } from "@/types/question";

const SYSTEM_PROMPT = `You are a search filter for a math exam question bank. Given the user's message, extract filters for:
- curriculum: one of ${CURRICULA.join(", ")} or null if not specified
- topic: one of ${TOPICS.join(", ")} or null if not specified  
- difficulty: one of ${DIFFICULTIES.join(", ")} or null if not specified

Examples:
"I want to practice IB trig" -> {"curriculum":"IB","topic":"Trigonometry","difficulty":null}
"hard calculus questions" -> {"curriculum":null,"topic":"Calculus","difficulty":"Hard"}
"HSC algebra" -> {"curriculum":"HSC","topic":"Algebra","difficulty":null}

Reply with ONLY a JSON object, no other text. Use null for any missing value.`;

function parseFilters(raw: string): AISearchFilters {
  const filters: AISearchFilters = {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    if (CURRICULA.includes(parsed.curriculum as Curriculum))
      filters.curriculum = parsed.curriculum as Curriculum;
    if (TOPICS.includes(parsed.topic as (typeof TOPICS)[number]))
      filters.topic = parsed.topic as string;
    if (DIFFICULTIES.includes(parsed.difficulty as Difficulty))
      filters.difficulty = parsed.difficulty as Difficulty;
  } catch {
    // ignore
  }
  return filters;
}

export async function POST(request: NextRequest) {
  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body", message: "Send { query: string }" },
      { status: 400 }
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return Response.json(
      { error: "Missing query", message: "Send { query: string }" },
      { status: 400 }
    );
  }

  try {
    const raw = await chatWithDeepseek(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      { maxTokens: 150, temperature: 0 }
    );

    const content = raw.trim().replace(/^```json?\s*|\s*```$/g, "") || "{}";
    const filters = parseFilters(content);

    return Response.json({ filters, query });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Local AI request failed";
    return Response.json(
      { error: "AI search failed", message },
      { status: 502 }
    );
  }
}
