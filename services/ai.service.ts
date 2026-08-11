/**
 * AIService — provider abstraction over LLM providers.
 *
 * Rule: AI never mutates data. Every method here is read/summarize only.
 * Keys are server-side only; never import this module into client components.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
}

export interface AIProvider {
  readonly name: string;
  chat(opts: { system: string; messages: ChatMessage[]; maxTokens?: number }): Promise<AIResponse>;
}

/** Default provider — OpenRouter (free models supported via `:free` model suffixes). */
export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"
  ) {}

  async chat(opts: {
    system: string;
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<AIResponse> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 800,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { content, provider: this.name, model: this.model };
  }
}

/** Stand-in providers for future integrations (OpenAI / Gemini / Claude). */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  async chat(): Promise<AIResponse> {
    throw new Error("OpenAI provider not configured yet");
  }
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  async chat(): Promise<AIResponse> {
    throw new Error("Gemini provider not configured yet");
  }
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";
  async chat(): Promise<AIResponse> {
    throw new Error("Claude provider not configured yet");
  }
}

export class AIService {
  constructor(private readonly provider: AIProvider) {}

  static fromEnv(): AIService {
    const key = process.env.OPENROUTER_API_KEY;
    if (key) return new AIService(new OpenRouterProvider(key));
    return new AIService(new LocalFallbackProvider());
  }

  async chat(messages: ChatMessage[], opts?: { system?: string; maxTokens?: number }): Promise<AIResponse> {
    return this.provider.chat({
      system: opts?.system ?? "You are MediFlow AI, an assistant for a pharmacy management system.",
      messages,
      maxTokens: opts?.maxTokens,
    });
  }

  async summarizeDashboard(metrics: unknown): Promise<AIResponse> {
    return this.provider.chat({
      system:
        "You are the business analyst for a medical store. Summarize the day's performance " +
        "in 4-6 crisp sentences, highlight anomalies and give one actionable recommendation. " +
        "Never mention that you lack data; use only the numbers provided.",
      messages: [
        {
          role: "user",
          content: `Here is today's business summary as JSON:\n${JSON.stringify(metrics)}`,
        },
      ],
      maxTokens: 600,
    });
  }
}

/**
 * Deterministic fallback used when no API key is configured — keeps the UI
 * functional during development and demos.
 */
export class LocalFallbackProvider implements AIProvider {
  readonly name = "local-fallback";

  async chat(): Promise<AIResponse> {
    return {
      content:
        "📊 **Demo insight (no AI key configured):** Today's sales are on track with your " +
        "7-day average. Stock levels for fast-moving items look healthy, but keep an eye on " +
        "the near-expiry list below.\n\n" +
        "> Connect an `OPENROUTER_API_KEY` to enable real AI summaries and the assistant.",
      provider: this.name,
      model: "local-fallback",
    };
  }
}
