const DEFAULT_OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const DEFAULT_MODEL =
  process.env.OLLAMA_MODEL ||
  process.env.DEEPSEEK_MODEL ||
  "mightykatun/qwen2.5-math:1.5b";

const FALLBACK_MODELS = [
  "mightykatun/qwen2.5-math:1.5b",
  "llama3.2:1b",
  "llama3.2:latest",
  "deepseek-r1:latest",
  "gemma3:4b",
];

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const VERDICT_PREFERRED_MODELS = [
  "llama3.2:1b",
  "llama3.2:latest",
  "llama3.2:3b",
  "gemma3:4b",
];

interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  /** Override model resolution order (e.g. instruction-following models for grading). */
  preferredModels?: string[];
}

let cachedModel: string | null = null;

function ollamaHost(): string {
  return DEFAULT_OLLAMA_HOST.replace(/\/+$/, "");
}

async function listOllamaModels(): Promise<string[]> {
  const res = await fetch(`${ollamaHost()}/api/tags`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { models?: { name: string }[] };
  return data.models?.map((m) => m.name) ?? [];
}


/** Pick an installed Ollama model, preferring env default then fallbacks. */
export async function resolveOllamaModel(preferred?: string[]): Promise<string> {
  if (!preferred && cachedModel) return cachedModel;

  let available: string[] = [];
  try {
    available = await listOllamaModels();
  } catch {
    if (preferred?.length) return preferred[0];
    cachedModel = DEFAULT_MODEL;
    return cachedModel;
  }

  if (available.length === 0) {
    throw new Error(
      "Ollama is reachable but no models are installed. Run: ollama pull llama3.2:1b"
    );
  }

  const candidates = preferred?.length
    ? preferred
    : [DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_MODEL)];
  for (const candidate of candidates) {
    const hit = available.find((n) => n === candidate || n.startsWith(`${candidate}:`));
    if (hit) {
      if (!preferred) cachedModel = hit;
      return hit;
    }
  }

  const fallback = available[0];
  if (!preferred) cachedModel = fallback;
  return fallback;
}

export { VERDICT_PREFERRED_MODELS };

export async function chatWithDeepseek(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const host = ollamaHost();
  const model = await resolveOllamaModel(options.preferredModels);

  const body = {
    model,
    messages,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.2,
      num_predict: options.maxTokens ?? 512,
    },
  };

  let res: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      throw new Error(`Ollama request timed out (model: ${model}). Try a smaller model.`);
    }
    throw new Error(
      `Cannot reach Ollama at ${host}. Start Ollama (ollama serve) and pull a model. (${msg})`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Local LLM error (${res.status}): ${text.slice(0, 300) || res.statusText}`
    );
  }

  const data = (await res.json()) as {
    message?: { role: string; content: string };
    messages?: { role: string; content: string }[];
    error?: string;
  };

  if (data.error) {
    throw new Error(data.error);
  }

  if (data.message?.content?.trim()) {
    return data.message.content.trim();
  }

  if (Array.isArray(data.messages) && data.messages.length > 0) {
    const combined = data.messages
      .filter((m) => m.role === "assistant" && typeof m.content === "string")
      .map((m) => m.content)
      .join("\n")
      .trim();
    if (combined) return combined;
  }

  throw new Error(
    `Local LLM returned an empty response (model: ${model}). Try: ollama pull ${DEFAULT_MODEL}`
  );
}

interface OllamaChunk {
  message?: { content?: string };
  response?: string;
  done?: boolean;
}

export async function chatWithDeepseekStream(
  messages: ChatMessage[],
  options: ChatOptions & { onChunk: (delta: string) => void }
): Promise<void> {
  const { onChunk, ...opts } = options;
  const host = ollamaHost();
  const model = await resolveOllamaModel(options.preferredModels);

  const body = {
    model,
    messages,
    stream: true,
    options: {
      temperature: opts.temperature ?? 0.2,
      num_predict: opts.maxTokens ?? 512,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot reach Ollama at ${host}. (${msg})`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Local LLM error (${res.status}): ${text.slice(0, 300)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from Ollama");

  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed) as OllamaChunk;
          const delta = data.message?.content ?? data.response ?? "";
          if (delta) {
            accumulated += delta;
            onChunk(delta);
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer.trim()) as OllamaChunk;
        const delta = data.message?.content ?? data.response ?? "";
        if (delta) {
          accumulated += delta;
          onChunk(delta);
        }
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!accumulated.trim()) {
    throw new Error(`Local LLM stream returned no content (model: ${model}).`);
  }
}
