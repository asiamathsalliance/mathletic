import { NextRequest } from "next/server";
import { createClient, createAnonClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { gradeTypedAnswer } from "@/lib/gradeAnswer";
import { getQuestionSecret } from "@/lib/questionSecrets";
import {
  buildVerdictUserMessage,
  parseVerdictFromAnalysis,
  type AnswerCheckContext,
} from "@/lib/checkAnswer";
import { chatWithDeepseek, VERDICT_PREFERRED_MODELS } from "@/lib/localLlm";
import { COMPETITION_TO_LABEL, type Competition } from "@/types/question";

/**
 * POST /api/grade
 * Body: { questionId, studentAnswer }
 * Returns: { verdict, solution?, solutionImage? }
 * Never returns answer_value. Solution only when correct.
 */
export async function POST(request: NextRequest) {
  let body: { questionId?: string; studentAnswer?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const questionId = body.questionId?.trim();
  const studentAnswer = String(body.studentAnswer ?? "").trim();
  if (!questionId) {
    return Response.json({ error: "Missing questionId" }, { status: 400 });
  }
  if (!studentAnswer) {
    return Response.json({ error: "Enter an answer first." }, { status: 400 });
  }

  let questionText = "";
  let solution = "";
  let solutionImage: string | null = null;
  let answerValue: string | null = null;
  let answerType: "numeric" | "symbolic" | "expression" | null = null;
  let context: AnswerCheckContext = {};

  if (isSupabaseConfigured()) {
    const anon = createAnonClient();
    const { data: row, error } = await anon
      .from("questions")
      .select(
        "id, verified, question_text, solution, solution_image_url, answer_value, answer_type, competition, topic, difficulty, exam_source"
      )
      .eq("id", questionId)
      .eq("verified", true)
      .maybeSingle();

    if (!error && row) {
      questionText = String(row.question_text ?? "");
      solution = String(row.solution ?? "");
      solutionImage = (row.solution_image_url as string | null) ?? null;
      answerValue = (row.answer_value as string | null) ?? null;
      answerType = (row.answer_type as typeof answerType) ?? null;
      const competition = row.competition as Competition | undefined;
      context = {
        curriculum: competition
          ? COMPETITION_TO_LABEL[competition] ?? String(competition)
          : undefined,
        topic: String(row.topic ?? ""),
        difficulty: String(row.difficulty ?? ""),
        examSource: String(row.exam_source ?? ""),
      };
    }
  }

  if (!questionText) {
    const secret = getQuestionSecret(questionId);
    if (!secret) {
      return Response.json({ error: "Question not found" }, { status: 404 });
    }
    questionText = secret.questionText;
    solution = secret.solution;
    solutionImage = secret.solutionImage ?? null;
    answerValue = secret.answerValue;
    answerType = secret.answerType;
    context = {
      curriculum: secret.competition
        ? COMPETITION_TO_LABEL[secret.competition]
        : undefined,
      topic: secret.topic,
      difficulty: secret.difficulty,
      examSource: secret.examSource,
    };
  } else if (!answerValue) {
    const secret = getQuestionSecret(questionId);
    if (secret?.answerValue) {
      answerValue = secret.answerValue;
      answerType = secret.answerType;
    }
  }

  let verdict = gradeTypedAnswer(studentAnswer, answerValue, answerType);

  if (verdict === "ambiguous") {
    try {
      const userContent = buildVerdictUserMessage(questionText, studentAnswer, context);
      const systemPrompt = `You grade high school mathematics answers for ONE problem only.
Reply with EXACTLY two lines:
VERDICT: CORRECT
REASON: <short reason>
or VERDICT: INCORRECT / VERDICT: PARTIAL with REASON.
VERDICT must be CORRECT, PARTIAL, or INCORRECT.`;
      const raw = await chatWithDeepseek(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        { maxTokens: 220, temperature: 0.05, preferredModels: VERDICT_PREFERRED_MODELS }
      );
      const aiVerdict = parseVerdictFromAnalysis(raw.trim(), studentAnswer, questionText);
      verdict = aiVerdict === "correct" ? "correct" : "incorrect";
    } catch {
      return Response.json(
        { error: "Answer checking unavailable", verdict: "incorrect" },
        { status: 503 }
      );
    }
  }

  const correct = verdict === "correct";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from("question_attempts")
          .select("id, attempt_count, status, solved_at")
          .eq("user_id", user.id)
          .eq("question_id", questionId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("question_attempts")
            .update({
              attempt_count: (existing.attempt_count ?? 1) + 1,
              status: correct || existing.status === "solved" ? "solved" : "attempted",
              solved_at:
                correct && !existing.solved_at
                  ? new Date().toISOString()
                  : existing.solved_at,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("question_attempts").insert({
            user_id: user.id,
            question_id: questionId,
            status: correct ? "solved" : "attempted",
            attempt_count: 1,
            solved_at: correct ? new Date().toISOString() : null,
          });
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  if (!correct) {
    return Response.json({ verdict: "incorrect" });
  }

  return Response.json({
    verdict: "correct",
    solution,
    solutionImage,
  });
}
