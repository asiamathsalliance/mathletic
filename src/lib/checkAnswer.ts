import { AiUnavailableError, isAiUnavailableError } from "@/lib/aiErrors";

export interface AnswerCheckContext {
  curriculum?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: string;
  examSource?: string;
}

export type AnswerVerdict = "correct" | "partial" | "incorrect";

export interface AnswerCheckResult {
  verdict: AnswerVerdict;
  analysis: string;
}

export function buildVerdictUserMessage(
  questionText: string,
  studentAnswer: string,
  context?: AnswerCheckContext
): string {
  const meta: string[] = [];
  if (context?.curriculum) meta.push(`Curriculum: ${context.curriculum}`);
  if (context?.topic) meta.push(`Topic: ${context.topic}`);
  if (context?.subtopic) meta.push(`Subtopic: ${context.subtopic}`);
  if (context?.difficulty) meta.push(`Difficulty: ${context.difficulty}`);
  if (context?.examSource) meta.push(`Source: ${context.examSource}`);

  const metaBlock = meta.length ? `${meta.join("\n")}\n\n` : "";

  return `${metaBlock}QUESTION:
${questionText.trim()}

STUDENT ANSWER:
${studentAnswer.trim()}`;
}

function squeezeFinalExpression(value: string): string {
  let expr = value.trim();
  if (expr.includes("=")) {
    expr = expr.slice(expr.lastIndexOf("=") + 1);
  }
  return normalizeAnswer(expr);
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\$/g, "")
    .replace(/\\boxed\{([^}]*)\}/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/^f'\(x\)\s*=\s*/i, "")
    .replace(/^f\(x\)\s*=\s*/i, "")
    .replace(/^y\s*=\s*/i, "")
    .replace(/\s+/g, "");
}

function extractModelFinalAnswer(text: string): string | null {
  const boxed = text.match(/\\boxed\{([^}]+)\}/);
  if (boxed) return normalizeAnswer(boxed[1]);

  const exprMatches = [...text.matchAll(/f'\(x\)\s*=\s*([^.,\n]+)/gi)];
  if (exprMatches.length > 0) {
    return squeezeFinalExpression(exprMatches[exprMatches.length - 1][1]);
  }

  const reasonLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^REASON\s*:/i.test(l));
  if (reasonLine) {
    const tail = reasonLine.replace(/^REASON\s*:\s*/i, "").trim();
    const num = tail.match(/(?:=|\bis\b)\s*([0-9.+\-]+)/i);
    if (num) return normalizeAnswer(num[1]);
  }

  const lastEq = text.match(/=\s*([0-9.+\-]+)\s*(?:\.|$|\n|\\)/g);
  if (lastEq?.length) {
    const m = lastEq[lastEq.length - 1].match(/=\s*([0-9.+\-]+)/);
    if (m) return normalizeAnswer(m[1]);
  }

  return null;
}

function inferPartialForClassification(
  studentAnswer: string,
  questionText: string
): AnswerVerdict | null {
  const s = studentAnswer.toLowerCase().trim();
  const q = questionText.toLowerCase();
  if (s.split(/\s+/).length > 30) return null;

  const mentionsQuartic = /\bquartic\b/.test(s);
  const mentionsCubic = /\bcubic\b/.test(s);
  const mentionsQuadratic = /\bquadratic\b/.test(s);
  const mentionsPolynomial = /\bpolynomial\b/.test(s);
  const mentionsInduction = /\binduction\b/.test(s);
  const mentionsFactor = /\bfactor/i.test(s);
  const mentionsSubstitut = /\bsubstitut/i.test(s);

  const hasFinalSolution =
    /\bx\s*=/.test(s) ||
    /=\s*[-+]?\d/.test(s) ||
    /\btherefore\b/.test(s) ||
    /\bthus\b/.test(s) ||
    /\bsolution is\b/.test(s);

  if (hasFinalSolution) return null;

  const quarticQuestion = /\bx\^4\b|\bx⁴\b|fourth.?degree|quartic/.test(q);
  if (mentionsQuartic && quarticQuestion) return "partial";
  if (mentionsCubic && (/\bx\^3\b|\bcubic/.test(q) || mentionsCubic)) return "partial";
  if (mentionsQuadratic && (/\bx\^2\b|quadratic/.test(q) || mentionsQuadratic)) return "partial";
  if (mentionsPolynomial && /polynomial|x\^/.test(q)) return "partial";
  if (mentionsInduction && /induction/.test(q)) return "partial";
  if ((mentionsFactor || mentionsSubstitut) && s.split(/\s+/).length <= 12) return "partial";

  return null;
}

function stripPromptEcho(text: string): string {
  let out = text.trim();
  const cutPatterns = [
    /--- QUESTION[\s\S]*/i,
    /--- STUDENT ANSWER[\s\S]*/i,
    /\nQUESTION:\s*[\s\S]*/i,
    /\nSTUDENT ANSWER:\s*[\s\S]*/i,
  ];
  for (const pattern of cutPatterns) {
    out = out.replace(pattern, "").trim();
  }
  return out;
}

function stripOffTopicParagraphs(text: string, questionText?: string): string {
  if (!questionText) return text;
  const q = questionText.toLowerCase();

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return text;

  const kept = sentences.filter((s) => {
    const lower = s.toLowerCase();
    if (!/induction/.test(q) && /mathematical induction|base case|inductive step|we assume|assume that for some/i.test(lower)) {
      return false;
    }
    if (/^QUESTION:/i.test(s) || /^STUDENT ANSWER:/i.test(s)) return false;
    return true;
  });

  return kept.join(" ").trim() || text.trim();
}

function hasStructuredVerdict(text: string): boolean {
  return /^VERDICT\s*:/im.test(text);
}

function inferVerdictFromAnswerMatch(
  modelText: string,
  studentAnswer: string
): AnswerVerdict | null {
  const student = squeezeFinalExpression(studentAnswer);
  if (!student) return null;

  const modelFinal = extractModelFinalAnswer(modelText);
  if (modelFinal && student === modelFinal) return "correct";

  const lower = modelText.toLowerCase();
  const correctAnswerMatch = lower.match(/correct answer is\s+([0-9.+\-/\\(){}^]+)/);
  if (correctAnswerMatch && normalizeAnswer(correctAnswerMatch[1]) === student) {
    return "correct";
  }

  if (
    /\b(is|are)\s+(mathematically\s+)?correct\b/.test(lower) ||
    /\bstudent'?s?\s+answer\s+is\s+correct\b/.test(lower) ||
    /\bcorrectly\b/.test(lower)
  ) {
    if (modelFinal && student === modelFinal) return "correct";
  }

  return null;
}

/** Parse LLM verdict from structured or free-form output. */
export function parseVerdictFromAnalysis(
  text: string,
  studentAnswer?: string,
  questionText?: string
): AnswerVerdict {
  const trimmed = text.trim();
  if (!trimmed) return "incorrect";

  if (studentAnswer?.trim() && questionText?.trim()) {
    const partial = inferPartialForClassification(studentAnswer, questionText);
    if (partial) return partial;
  }

  if (studentAnswer?.trim()) {
    const inferred = inferVerdictFromAnswerMatch(trimmed, studentAnswer);
    if (inferred === "correct") return "correct";

    if (!hasStructuredVerdict(trimmed)) {
      const modelFinal = extractModelFinalAnswer(trimmed);
      const student = squeezeFinalExpression(studentAnswer);
      if (modelFinal && student && modelFinal === student) return "correct";
    }
  }

  const verdictLine = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^VERDICT\s*:/i.test(l) || /^(CORRECT|PARTIAL|INCORRECT)\b/i.test(l));

  if (verdictLine) {
    const upper = verdictLine.toUpperCase();
    let verdict: AnswerVerdict = "incorrect";
    if (/VERDICT\s*:\s*CORRECT/i.test(verdictLine) || /^CORRECT\b/.test(upper)) verdict = "correct";
    else if (/VERDICT\s*:\s*PARTIAL/i.test(verdictLine) || /^PARTIAL\b/.test(upper)) verdict = "partial";
    else if (/VERDICT\s*:\s*INCORRECT/i.test(verdictLine) || /^INCORRECT\b/.test(upper)) verdict = "incorrect";

    if (verdict === "correct" && studentAnswer?.trim()) {
      const modelFinal = extractModelFinalAnswer(trimmed);
      const student = squeezeFinalExpression(studentAnswer);
      if (modelFinal && student && modelFinal !== student) return "incorrect";
    }

    return verdict;
  }

  const lower = trimmed.toLowerCase();
  if (/\\boxed\{\s*\\?text\{?\s*correct/i.test(trimmed)) return "correct";
  if (/\\boxed\{\s*correct/i.test(trimmed)) return "correct";
  if (!studentAnswer?.trim()) {
    if (/\b(is|are)\s+(mathematically\s+)?correct\b/.test(lower)) return "correct";
    if (/\bstudent'?s?\s+answer\s+is\s+correct\b/.test(lower)) return "correct";
    if (/\bfinal answer is:?\s*[\s\S]*correct\b/.test(lower)) return "correct";
  }
  if (/\bpartially\s+correct\b/.test(lower)) return "partial";
  if (/\bpartial\s+credit\b/.test(lower)) return "partial";

  return "incorrect";
}

/** Remove verdict header lines; keep explanation body for display. */
export function formatAnalysisForDisplay(text: string, questionText?: string): string {
  let trimmed = stripPromptEcho(text.trim());

  const reasonLine = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^REASON\s*:/i.test(l));
  if (reasonLine) {
    return reasonLine.replace(/^REASON\s*:\s*/i, "").trim();
  }

  trimmed = stripOffTopicParagraphs(trimmed, questionText);

  const lines = trimmed.split(/\r?\n/).filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/^VERDICT\s*:/i.test(t)) return false;
    if (/^(CORRECT|PARTIAL|INCORRECT)\s*$/i.test(t)) return false;
    if (/^---/.test(t)) return false;
    if (/^(Curriculum|Topic|Subtopic|Difficulty|Source):/i.test(t)) return false;
    if (/^QUESTION:/i.test(t)) return false;
    if (/^STUDENT ANSWER:/i.test(t)) return false;
    return true;
  });

  let body = lines.join("\n").trim();
  body = body.replace(/^REASON\s*:\s*/i, "").trim();

  if (body.length > 320) {
    const sentences = body.split(/(?<=[.!?])\s+/);
    const short = sentences.find(
      (s) => s.length < 220 && /student|answer|equation|step|partial|correct|try|need/i.test(s)
    );
    if (short) return short.trim();
    body = sentences.slice(0, 2).join(" ").trim();
  }

  if (!body) {
    return "Answer checked.";
  }
  return body;
}

export async function checkAnswerWithLocalModel(
  questionText: string,
  studentAnswer: string,
  context?: AnswerCheckContext
): Promise<AnswerCheckResult> {
  const q = questionText.trim();
  const a = studentAnswer.trim();
  if (!q) {
    throw new Error("This question has no text for the AI to grade against.");
  }
  if (!a) {
    throw new Error("Please enter your answer before checking.");
  }

  const formData = new FormData();
  formData.append("questionText", q);
  formData.append("studentAnswer", a);
  if (context?.curriculum) formData.append("curriculum", context.curriculum);
  if (context?.topic) formData.append("topic", context.topic);
  if (context?.subtopic) formData.append("subtopic", context.subtopic);
  if (context?.difficulty) formData.append("difficulty", context.difficulty);
  if (context?.examSource) formData.append("examSource", context.examSource);

  const res = await fetch("/api/analyze-solution?mode=verdict", {
    method: "POST",
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 502 || res.status === 503) {
      throw new AiUnavailableError();
    }
    const message =
      (body as { message?: string; error?: string }).message ||
      (body as { error?: string }).error ||
      "Failed to check answer.";
    if (isAiUnavailableError(new Error(message))) {
      throw new AiUnavailableError();
    }
    throw new Error(message);
  }

  const data = body as { analysis?: string; verdict?: AnswerVerdict };
  const raw = data.analysis?.trim() ?? "";
  if (!raw) {
    throw new AiUnavailableError();
  }

  const verdict = data.verdict ?? parseVerdictFromAnalysis(raw, a, q);
  const analysis = formatAnalysisForDisplay(raw, q);

  return { verdict, analysis: analysis || "Answer checked." };
}
