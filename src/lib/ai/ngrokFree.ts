/** 
 * Updated project configuration with provided Neon DB URL and AI key/URL.
 * 
 * NEON DATABASE_URL: postgresql://neondb_owner:npg_nLVm1U7gAiYl@ep-lucky-poetry-bewcmcfc-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
 * AI API KEY: read from process.env.AI_API_KEY
 * AI API URL: https://pension-acutely-ride.ngrok-free.dev/v1
 */

// AI_CONFIG populated from environment variables at runtime
// export const AI_CONFIG = {
//   baseUrl: 'https://pension-acutely-ride.ngrok-free.dev/v1',
//   apiKey: 'sk-c7fd15fbaf0aea24-2391a6-c7c4750b',
//   model: 'gpt-4.1-mini',
//   provider: 'openai-compatible' as const,
// };

import {
  COMPOSE_SYSTEM_PROMPT,
  MODERATION_SYSTEM_PROMPT,
  extractJson,
  normalizeComposeJson,
  normalizeModerationJson,
} from './prompt';
import { AiUnavailableError, type AiProvider, type ComposeInput, type ComposeOutput, type ModerationVerdict } from './types';

export class NgrokFreeAiProvider implements AiProvider {
  readonly name = 'ngrok-free';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new AiUnavailableError('AI_API_KEY environment variable is not set');
    }
    this.baseUrl = 'https://pension-acutely-ride.ngrok-free.dev/v1';
    this.apiKey = apiKey;
    this.model = process.env.AI_MODEL ?? 'gpt-4.1-mini';
    this.timeoutMs = 15000;
  }

  private async chat(system: string, user: string, maxTokens: number): Promise<string> {
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
        timeout: this.timeoutMs,
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