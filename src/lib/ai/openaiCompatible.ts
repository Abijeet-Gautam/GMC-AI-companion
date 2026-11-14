/**
 * OpenAI-compatible provider — the "custom API key" path the owner has today.
 * Works with any chat-completions endpoint: OpenAI, OpenRouter, Groq, Together,
 * a self-hosted vLLM, etc. Configure via:
 *   AI_BASE_URL   (default https://api.openai.com/v1)
 *   AI_API_KEY    (required)
 *   AI_MODEL      (e.g. gpt-4.1-mini / openrouter id / ...)
 *   AI_TIMEOUT_MS (default 15000)
 * Switching to Anthropic later = set AI_PROVIDER=anthropic and ANTHROPIC_*.
 * No code change.
 */
import {
  COMPOSE_SYSTEM_PROMPT,
  MODERATION_SYSTEM_PROMPT,
  extractJson,
  normalizeComposeJson,
  normalizeModerationJson,
} from './prompt';
import { AiUnavailableError, type AiProvider, type ComposeInput, type ComposeOutput, type ModerationVerdict } from './types';

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai-compatible';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const key = env.AI_API_KEY ?? env.OPENAI_API_KEY;
    if (!key) throw new AiUnavailableError('AI_API_KEY is not set');
    this.baseUrl = (env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.apiKey = key;
    this.model = env.AI_MODEL ?? 'gpt-4.1-mini';
    this.timeoutMs = Number(env.AI_TIMEOUT_MS ?? 15000);
  }

  private async chat(system: string, user: string, maxTokens: number): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AiUnavailableError(`AI endpoint ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new AiUnavailableError('AI endpoint returned no content');
      return text;
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new AiUnavailableError(`AI request failed: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async moderate(text: string): Promise<ModerationVerdict> {
    const raw = await this.chat(MODERATION_SYSTEM_PROMPT, text.slice(0, 2000), 200);
    const parsed = normalizeModerationJson(extractJson(raw));
    return { ...parsed, engine: 'ai' };
  }

  async compose({ aspiration }: ComposeInput): Promise<ComposeOutput> {
    const raw = await this.chat(COMPOSE_SYSTEM_PROMPT, aspiration.slice(0, 2000), 700);
    return normalizeComposeJson(extractJson(raw));
  }
}
