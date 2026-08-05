import type {
  Competition,
  CurriculumLabel,
  Difficulty,
  Question,
} from "@/types/question";
import { COMPETITION_TO_LABEL } from "@/types/question";
import { truncateLatex, getSimpleTopic } from "@/lib/questionTable";
import { seededRandom } from "@/lib/questionUtils";

/** Lightweight row for the practice table — no choices/solution payload. */
export interface QuestionSummary {
  id: string;
  curriculum: CurriculumLabel;
  competition: Competition;
  topic: string;
  difficulty: Difficulty;
  year: number;
  examSource: string;
  /** Truncated question stem for list preview (~90 chars). */
  preview: string;
  isMcq: boolean;
  amcYear?: number;
  amcVariant?: "A" | "B";
  problemNumber?: number;
}

export function questionToSummary(q: Question): QuestionSummary {
  const competition =
    q.competition ??
    ({
      "AMC 10": "AMC10",
      "AMC 12": "AMC12",
      HSC: "HSC",
      IB: "IB",
      AP: "AP",
      "A-Level": "A_LEVEL",
    } as const)[q.curriculum];

  return {
    id: q.id,
    curriculum: q.curriculum,
    competition: competition as Competition,
    topic: q.topic,
    difficulty: q.difficulty,
    year: q.year,
    examSource: q.examSource,
    preview: truncateLatex(q.questionText, 90),
    isMcq: Boolean(q.choices && q.choices.length >= 4 && typeof q.correctIndex === "number"),
    amcYear: q.amcYear,
    amcVariant: q.amcVariant,
    problemNumber: q.problemNumber,
  };
}

export function rowToSummary(row: {
  id: string;
  competition: Competition;
  topic: string;
  year: number | null;
  exam_source: string | null;
  difficulty: Difficulty;
  amc_year: number | null;
  amc_variant: "A" | "B" | null;
  problem_number: number | null;
  question_text: string;
  choices: string[] | null;
}): QuestionSummary {
  return {
    id: row.id,
    curriculum: COMPETITION_TO_LABEL[row.competition] ?? row.competition,
    competition: row.competition,
    topic: row.topic,
    difficulty: row.difficulty,
    year: row.year ?? row.amc_year ?? 0,
    examSource: row.exam_source ?? "",
    preview: truncateLatex(row.question_text, 90),
    isMcq: Array.isArray(row.choices) && row.choices.length >= 4,
    amcYear: row.amc_year ?? undefined,
    amcVariant: row.amc_variant ?? undefined,
    problemNumber: row.problem_number ?? undefined,
  };
}

/**
 * Mix categories for the default practice list: round-robin across topics,
 * and within each topic prefer alternating difficulties / competitions.
 */
export function interleaveSummaries(items: QuestionSummary[], seed = 42): QuestionSummary[] {
  if (items.length <= 1) return items;

  const rng = seededRandom(seed);
  const byTopic = new Map<string, QuestionSummary[]>();
  for (const item of items) {
    const key = getSimpleTopic(item.topic);
    const list = byTopic.get(key) ?? [];
    list.push(item);
    byTopic.set(key, list);
  }

  // Shuffle within each topic bucket (stable seed).
  for (const [key, list] of byTopic) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    // Soft-sort so Easy/Med/Hard aren't clumped after shuffle.
    list.sort((a, b) => {
      const da = a.difficulty === "Easy" ? 0 : a.difficulty === "Medium" ? 1 : 2;
      const db = b.difficulty === "Easy" ? 0 : b.difficulty === "Medium" ? 1 : 2;
      if (da !== db) return da - db;
      return (a.competition || "").localeCompare(b.competition || "");
    });
    // Re-interleave difficulty bands inside the topic.
    const easy = list.filter((x) => x.difficulty === "Easy");
    const med = list.filter((x) => x.difficulty === "Medium");
    const hard = list.filter((x) => x.difficulty === "Hard");
    const mixed: QuestionSummary[] = [];
    const max = Math.max(easy.length, med.length, hard.length);
    for (let i = 0; i < max; i++) {
      if (i < easy.length) mixed.push(easy[i]);
      if (i < med.length) mixed.push(med[i]);
      if (i < hard.length) mixed.push(hard[i]);
    }
    byTopic.set(key, mixed);
  }

  const topics = [...byTopic.keys()].sort();
  // Rotate topic order with seed so first page isn't always Algebra-first.
  const offset = Math.floor(rng() * topics.length);
  const orderedTopics = [...topics.slice(offset), ...topics.slice(0, offset)];

  const queues = orderedTopics.map((t) => [...(byTopic.get(t) ?? [])]);
  const out: QuestionSummary[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const q of queues) {
      if (q.length === 0) continue;
      out.push(q.shift()!);
      remaining -= 1;
    }
  }
  return out;
}
