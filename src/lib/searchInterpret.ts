import type { Curriculum, Difficulty } from "@/types/question";

/** Maps keywords/phrases to curriculum */
const CURRICULUM_KEYWORDS: { keys: string[]; value: Curriculum }[] = [
  { keys: ["ib", "international baccalaureate", "international"], value: "IB" },
  { keys: ["hsc", "australia", "australian", "nsw"], value: "HSC" },
  { keys: ["ap", "advanced placement", "american"], value: "AP" },
];

/** Maps keywords to topic name (must match TOPICS_BY_CURRICULUM) */
const TOPIC_KEYWORDS: { keys: string[]; value: string }[] = [
  { keys: ["trig", "trigonometry", "trigonometric", "sin", "cos", "tan"], value: "Trigonometry" },
  { keys: ["algebra", "algebraic", "quadratic", "equation", "linear", "polynomial"], value: "Algebra" },
  { keys: ["calculus", "integral", "integration", "derivative", "differentiation", "differentiate", "integrate"], value: "Calculus" },
  { keys: ["function", "functions", "graph", "transform", "inverse"], value: "Functions" },
  { keys: ["probability", "prob", "statistics", "stats", "normal", "distribution"], value: "Probability" },
  { keys: ["vector", "vectors", "dot product", "scalar", "magnitude"], value: "Vectors" },
];

/** Maps keywords to difficulty */
const DIFFICULTY_KEYWORDS: { keys: string[]; value: Difficulty }[] = [
  { keys: ["easy", "easier", "simple", "beginner"], value: "Easy" },
  { keys: ["medium", "moderate", "average"], value: "Medium" },
  { keys: ["hard", "harder", "difficult", "challenging", "advanced"], value: "Hard" },
];

export interface InterpretedQuery {
  curriculum?: Curriculum;
  topic?: string;
  difficulty?: Difficulty;
  /** Remaining words for content/tag matching */
  keywords: string[];
}

/**
 * Parses a natural language search query into curriculum, topic, difficulty,
 * and remaining keywords. Used for AI-style search (e.g. "IB trig questions" → IB + Trigonometry).
 */
export function interpretSearchQuery(query: string): InterpretedQuery {
  const lower = query.trim().toLowerCase();
  if (!lower) return { keywords: [] };

  const words = lower.split(/\s+/).filter((w) => w.length > 0);
  const used = new Set<string>();
  let curriculum: Curriculum | undefined;
  let topic: string | undefined;
  let difficulty: Difficulty | undefined;

  // Check multi-word phrases first (e.g. "international baccalaureate")
  for (const { keys, value } of CURRICULUM_KEYWORDS) {
    if (curriculum) break;
    for (const key of keys) {
      if (lower.includes(key)) {
        curriculum = value;
        key.split(/\s+/).forEach((w) => used.add(w));
        break;
      }
    }
  }

  for (const { keys, value } of TOPIC_KEYWORDS) {
    if (topic) break;
    for (const key of keys) {
      if (lower.includes(key)) {
        topic = value;
        key.split(/\s+/).forEach((w) => used.add(w));
        break;
      }
    }
  }

  for (const { keys, value } of DIFFICULTY_KEYWORDS) {
    if (difficulty) break;
    for (const key of keys) {
      if (lower.includes(key)) {
        difficulty = value;
        key.split(/\s+/).forEach((w) => used.add(w));
        break;
      }
    }
  }

  // Single-word curriculum (ib, hsc, ap) might not be in phrases
  if (!curriculum) {
    if (/\bib\b/.test(lower)) {
      curriculum = "IB";
      used.add("ib");
    } else if (/\bhsc\b/.test(lower)) {
      curriculum = "HSC";
      used.add("hsc");
    } else if (/\bap\b/.test(lower)) {
      curriculum = "AP";
      used.add("ap");
    }
  }

  // Filter out stopwords and used tokens for keyword search
  const stopwords = new Set([
    "i", "want", "to", "practice", "on", "questions", "question", "the", "a", "an",
    "and", "or", "for", "with", "my", "me", "get", "find", "some", "all", "any",
  ]);
  const keywords = words.filter(
    (w) => w.length > 1 && !stopwords.has(w) && !used.has(w)
  );

  return { curriculum, topic, difficulty, keywords };
}
