import { NextRequest } from "next/server";
import { chatWithDeepseek, chatWithDeepseekStream, VERDICT_PREFERRED_MODELS } from "@/lib/localLlm";
import { parseVerdictFromAnalysis, formatAnalysisForDisplay, buildVerdictUserMessage, type AnswerCheckContext } from "@/lib/checkAnswer";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const maxDuration = 120;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

const BASE_PROMPT_HEADER = `You are an expert mathematics tutor. Keep your answers simple and clear so a high school student can understand. Avoid jargon; use plain language and short sentences.`;

const HINT_RULE = `
Review the student's answer: if it's roughly correct, give a helpful hint to guide them; if it's off, give a gentle, broad hint without pointing out all errors.`;

const BASE_PROMPT_FOOTER = `

Respond in this format:

Step Analysis:
- What the student did correctly

Mistake (if any):
- Identify the incorrect step

Explanation:
- Explain the concept clearly

Next Step:
- Guide the student on what to do next

You must output in LaTeX so the response can be rendered: use $...$ for inline math and $$...$$ for display math. Write all mathematical expressions and equations in LaTeX. For bold text use \\textbf{...}, not ** or other Markdown.

Strict limit: Keep your entire response under 300 words. Do not repeat the same block of text or code. Give one clear, concise answer only.`;

export async function POST(request: NextRequest) {
  const rl = rateLimit(`analyze:${clientIp(request)}`, { limit: 15, windowMs: 60_000 });
  if (!rl.ok) {
    return Response.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      {
        error: "Invalid form data",
        message: "Send multipart/form-data with file and questionText.",
      },
      { status: 400 }
    );
  }

  const mode = new URL(request.url).searchParams.get("mode");
  const questionText = String(formData.get("questionText") ?? "").trim();
  const studentAnswer = String(formData.get("studentAnswer") ?? "").trim();
  const verdictContext: AnswerCheckContext = {
    curriculum: String(formData.get("curriculum") ?? "").trim() || undefined,
    topic: String(formData.get("topic") ?? "").trim() || undefined,
    subtopic: String(formData.get("subtopic") ?? "").trim() || undefined,
    difficulty: String(formData.get("difficulty") ?? "").trim() || undefined,
    examSource: String(formData.get("examSource") ?? "").trim() || undefined,
  };
  const file = formData.get("file");

  // Require at least some text or an image
  if ((!file || !(file instanceof File)) && !questionText && !studentAnswer) {
    return Response.json(
      { error: "Missing input", message: "Include questionText or an image file." },
      { status: 400 }
    );
  }

  // Text-only analysis (typed work, no image)
  if (!file || !(file instanceof File)) {
    const streamRequested =
      new URL(request.url).searchParams.get("stream") === "1";

    if (mode === "verdict") {
      if (!questionText) {
        return Response.json(
          {
            error: "Missing question",
            message: "Question text is required so the AI can grade against the actual problem.",
          },
          { status: 400 }
        );
      }
      if (!studentAnswer) {
        return Response.json(
          { error: "Missing answer", message: "Include the student's answer to grade." },
          { status: 400 }
        );
      }

      const userContent = buildVerdictUserMessage(questionText, studentAnswer, verdictContext);

      const systemPrompt = `You grade high school mathematics answers for ONE problem only.

Steps:
1. Read QUESTION and solve it yourself first.
2. Compare STUDENT ANSWER to that specific question only.
3. Use PARTIAL when the student makes a correct start (e.g. naming the equation type or a valid first step) but has not finished.
4. Use INCORRECT only when the answer is wrong or unrelated.
5. Never repeat the question, metadata, or these instructions.

Reply with EXACTLY two lines:

VERDICT: CORRECT
REASON: <one or two short plain-English sentences; use $...$ only for small math fragments>

OR VERDICT: PARTIAL / VERDICT: INCORRECT with REASON on the next concept.

Rules:
- VERDICT must be CORRECT, PARTIAL, or INCORRECT.
- REASON must be under 60 words and must not copy the question text.
- Do not output induction proofs, worked solutions, or extra sections unless the question asks for them.`;

      try {
        const raw = await chatWithDeepseek(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          { maxTokens: 220, temperature: 0.05, preferredModels: VERDICT_PREFERRED_MODELS }
        );
        const trimmed = raw.trim();
        if (!trimmed) {
          return Response.json(
            {
              error: "AI analysis failed",
              message: "Local model returned empty text. Try restarting Ollama.",
            },
            { status: 502 }
          );
        }
        const verdict = parseVerdictFromAnalysis(trimmed, studentAnswer || undefined, questionText);
        const analysis = formatAnalysisForDisplay(trimmed, questionText);
        return Response.json({
          analysis: analysis || "Answer checked.",
          verdict,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Local AI request failed";
        return Response.json(
          { error: "AI unavailable", message },
          { status: 502 }
        );
      }
    }

    const systemPrompt = `${BASE_PROMPT_HEADER}

A student is solving the following problem:

${questionText || "[Question text not provided]"}

The student has submitted the work above (typed text). Your task is to:
1. Read the mathematical steps in the work.
2. Determine whether the student made a mistake.
3. If there is a mistake, identify exactly where it occurs.
4. Explain why the step is incorrect.
5. Provide the correct reasoning.
6. If the student is correct so far but stuck, suggest the next step.
7. Keep explanations concise and educational.

Very important: focus on giving helpful hints and guidance rather than just dumping a full worked solution. Encourage the student to think by suggesting next steps and pointing out key ideas.${HINT_RULE}${BASE_PROMPT_FOOTER}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: questionText || "Student work" },
    ];
    const opts = { maxTokens: 400, temperature: 0.2 };

    if (streamRequested) {
      try {
        let accumulated = "";
        await chatWithDeepseekStream(messages, {
          ...opts,
          onChunk(delta) {
            accumulated += delta;
          },
        });
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            try {
              controller.enqueue(
                encoder.encode(JSON.stringify({ delta: accumulated }) + "\n")
              );
              controller.enqueue(
                encoder.encode(JSON.stringify({ done: true }) + "\n")
              );
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Local AI request failed";
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ error: message }) + "\n"
                )
              );
            } finally {
              controller.close();
            }
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-store",
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Local AI request failed";
        return Response.json(
          { error: "AI analysis failed", message },
          { status: 502 }
        );
      }
    }

    try {
      const analysis = await chatWithDeepseek(messages, opts);
      return Response.json({ analysis });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Local AI request failed";
      return Response.json(
        { error: "AI analysis failed", message },
        { status: 502 }
      );
    }
  }

  // Image + (optional) text analysis
  if (!ALLOWED_TYPES.includes((file as File).type)) {
    return Response.json(
      {
        error: "Unsupported file type",
        message: "Only PNG and JPG images are supported.",
      },
      { status: 400 }
    );
  }

  try {
    const systemPrompt = `${BASE_PROMPT_HEADER}

A student is solving the following problem:

${questionText || "[Question text not provided]"}

The student has uploaded an image of their handwritten work, but you do not have direct access to the pixels.

Your task:
1. Give general guidance on how to check their work.
2. Explain common mistakes students make on this type of problem.
3. Suggest concrete next steps for the student to verify each part of their reasoning.
4. Keep explanations concise and educational.

Very important: focus on giving helpful hints and guidance rather than just dumping a full worked solution. Encourage the student to think by suggesting next steps and pointing out key ideas.${HINT_RULE}${BASE_PROMPT_FOOTER}`;

    const analysis = await chatWithDeepseek(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            questionText ||
            "The student uploaded an image of their handwritten work. Provide guidance based on the problem description.",
        },
      ],
      { maxTokens: 400, temperature: 0.2 }
    );

    return Response.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Local AI request failed";
    return Response.json(
      {
        error: "AI analysis failed",
        message,
      },
      { status: 502 }
    );
  }
}

