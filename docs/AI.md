# MediFlow AI — AI Architecture

## Principle

> **AI never directly modifies data. It only assists.**

All AI features are read-only assistants: they summarize, explain, recommend, and chat — using
structured context fetched by repositories. Any action the user takes from an AI suggestion goes
through the normal validated service flow.

## Provider Abstraction (`services/ai.service.ts`)

```ts
interface AIProvider {
  chat(opts: { system: string; messages: ChatMessage[]; maxTokens?: number }): Promise<AIResponse>;
}

class OpenRouterProvider implements AIProvider { ... }   // default
class OpenAIProvider implements AIProvider { ... }       // future
class GeminiProvider implements AIProvider { ... }       // future
class ClaudeProvider implements AIProvider { ... }       // future

class AIService {
  constructor(private provider: AIProvider) {}
  async summarizeDashboard(metrics) { ... }
  async chat(context, question) { ... }
  async insights(metrics) { ... }
}
```

- Provider selected from env (`OPENROUTER_API_KEY` → OpenRouter; model via `OPENROUTER_MODEL`).
- Keys are **server-only**; AI endpoints live under `app/api/ai/*`.
- Free OpenRouter models work via `:free` model suffixes (e.g. `meta-llama/llama-3.3-70b-instruct:free`).

## Safety Rules

- Never pass raw PII in prompts — aggregate and anonymize (metrics, counts, top-N lists).
- Cap context size; truncate history for `/api/ai/chat`.
- Rate limit AI endpoints.
- Log AI calls to `ai_conversations` (user, prompt, provider, response) for audit.

## Planned Features (Phase 8)

- Dashboard daily summary + revenue/profit explanation
- Reorder recommendations, stockout prediction, dead stock detection, expiry suggestions
- Upsell + frequently-bought-together + peak sales hours + customer behavior
- Assistant chat: "Show medicines expiring next month", "Highest profit medicines",
  "Top suppliers", "Today's margin", "Generate purchase order", "Which medicines haven't sold in 6 months?"
- Report summarization + anomaly highlighting

## Prompt Engineering Notes

- System prompts describe role + output format (JSON where structured).
- Responses validated against a Zod schema before returning to the client; fall back to a
  deterministic message on parse failure.
