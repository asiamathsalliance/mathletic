export const AI_UNAVAILABLE_MESSAGE =
  "This feature isn't available right now. AI checking needs a running local model (Ollama) or a valid API key with credit.";

export class AiUnavailableError extends Error {
  constructor(message = AI_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export function isAiUnavailableError(err: unknown): boolean {
  if (err instanceof AiUnavailableError) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("cannot reach ollama") ||
    msg.includes("local llm") ||
    msg.includes("ollama request timed out") ||
    msg.includes("no models are installed") ||
    msg.includes("ai returned an empty") ||
    msg.includes("insufficient_quota") ||
    msg.includes("billing") ||
    msg.includes("api key") ||
    msg.includes("incorrect api key") ||
    msg.includes("ai analysis failed") ||
    msg.includes("failed to check answer") ||
    msg.includes("this feature isn't available")
  );
}

export function toAiUnavailableError(err: unknown): AiUnavailableError {
  if (err instanceof AiUnavailableError) return err;
  if (isAiUnavailableError(err)) return new AiUnavailableError();
  return new AiUnavailableError();
}
