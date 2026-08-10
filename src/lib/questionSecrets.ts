/**
 * Server-only answer keys from the JSON bank (fallback when DB has no row).
 * Never import this from client components.
 */
import type { Competition, Question } from "@/types/question";
import questionsHsc from "@/data/questions-hsc.json";
import questionsIb from "@/data/questions-ib.json";
import questionsAp from "@/data/questions-ap.json";
import questionsAlevel from "@/data/questions-alevel.json";
import questionsAmc from "@/data/questions-amc.json";

export interface QuestionSecret {
  id: string;
  questionText: string;
  solution: string;
  solutionImage?: string;
  answerValue: string | null;
  answerType: "numeric" | "symbolic" | "expression";
  competition?: Competition;
  topic: string;
  difficulty: string;
  examSource: string;
}

function deriveFromQuestion(q: Question): QuestionSecret {
  const isMcq =
    Array.isArray(q.choices) &&
    q.choices.length >= 4 &&
    typeof q.correctIndex === "number" &&
    q.choices[q.correctIndex!] != null;

  let answerValue: string | null = null;
  let answerType: QuestionSecret["answerType"] = "expression";

  if (isMcq) {
    const raw = String(q.choices![q.correctIndex!]).trim();
    const latex = raw.replace(/^\$+|\$+$/g, "").trim();
    const numericPlain = latex
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
      .replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
      .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\cdot/g, "*")
      .replace(/\\times/g, "*")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, "");
    const isNumeric = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(numericPlain);
    const isSimpleFrac = /^-?\d+\/\d+$/.test(numericPlain);
    answerValue = latex || raw;
    answerType = isNumeric || isSimpleFrac ? "numeric" : "expression";
  }

  return {
    id: q.id,
    questionText: q.questionText,
    solution: q.solution ?? "",
    solutionImage: q.solutionImage,
    answerValue,
    answerType,
    competition: q.competition,
    topic: q.topic,
    difficulty: q.difficulty,
    examSource: q.examSource,
  };
}

const secretsById = new Map<string, QuestionSecret>(
  [
    ...(questionsAmc as Question[]),
    ...(questionsHsc as Question[]),
    ...(questionsIb as Question[]),
    ...(questionsAp as Question[]),
    ...(questionsAlevel as Question[]),
  ].map((q) => [q.id, deriveFromQuestion(q)])
);

export function getQuestionSecret(id: string): QuestionSecret | undefined {
  return secretsById.get(id);
}
