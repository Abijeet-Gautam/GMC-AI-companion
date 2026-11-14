/**
 * Anthropic provider — the "switch to Anthropic later" path.
 * Enable with: AI_PROVIDER=anthropic ANTHROPIC_API_KEY=... [ANTHROPIC_MODEL=...]
 *
 * Default model: claude-opus-5-5 per Anthropic's current guidance. Override with
 * ANTHROPIC_MODEL if you want a different tier (your call, not ours).
 */
import Anthropic from '@anthropic-ai/sdk';
import {
  COMPOSE_SYSTEM_PROMPT,
  MODERATION_SYSTEM_PROMPT,
  extractJson,
  normalizeComposeJson,
  normalizeModerationJson,
} from './prompt';
import { AiUnavailableError, type AiProvider, type ComposeInput, type ComposeOutput, type ModerationVerdict } from './types';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AiUnavailableError('ANTHROPIC_API_KEY is not set');
    this.timeoutMs = Number(env.AI_TIMEOUT_MS ?? 15000);
    this.client = new Anthropic({ apiKey, timeout: this.timeoutMs, maxRetries: 1 });
    this.model = env.ANTHROPIC_MODEL ?? 'claude-opus-5-5';
  }

  private async chat(system: string, user: string, maxTokens: number): Promise<string> {
    try {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      });
      if (res.stop_reason === 'refusal') {
        throw new AiUnavailableError('Anthropic safety classifiers declined the request');
      }
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      if (!text) throw new AiUnavailableError('Anthropic returned no text content');
      return text;
    } catch (err) {
      if (err instanceof AiUnavailableError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new AiUnavailableError(`Anthropic request failed: ${msg}`);
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
