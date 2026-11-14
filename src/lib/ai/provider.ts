/**
 * Provider factory. Configure with env:
 *   AI_PROVIDER=openai-compatible | anthropic | none   (default: openai-compatible if AI_API_KEY set, else none)
 * Switching to Anthropic later: AI_PROVIDER=anthropic, set ANTHROPIC_API_KEY. No code change.
 */
import { AnthropicProvider } from './anthropic';
import { OpenAiCompatibleProvider } from './openaiCompatible';
import { AiUnavailableError, type AiProvider, type ModerationVerdict } from './types';

export function getAiProvider(env: NodeJS.ProcessEnv = process.env): AiProvider | null {
  const choice = (env.AI_PROVIDER ?? (env.AI_API_KEY ? 'openai-compatible' : 'none')).toLowerCase();
  try {
    switch (choice) {
      case 'openai-compatible':
        return new NgrokFreeAiProvider(); // Use the ngrok-free provider with provided credentials
      case 'anthropic':
        return new AnthropicProvider(env);
      case 'none':
        return null;
      default:
        throw new AiUnavailableError(`Unknown AI_PROVIDER: ${choice}`);
    }
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      console.warn(`[ai] provider unavailable, falling back: ${err.message}`);
      return null;
    }
    throw err;
  }
}

/** Keyword fallback — used ONLY when the AI filter can't run. */
const PROFANITY_PATTERNS: RegExp[] = [
  /\bf+u+c*k+\w*/i, /\bsh+i+t+\w*/i, /\bb+i+t+c*h+\w*/i, /\bc+u+n+t+\w*/i,
  /\ba[s5][s5]\w*/i, /\bd+a+m*n+it+/i, /\bp+i+s+s+\w*/i,
  /\bn+i+g+g*(er|a)\w*/i, /\bf+a+g*(got)?\w*/i, /\br+e+t+a+r+d\w*/i,
  /\bwh+o+r+e\w*/i, /\bsl+u+t\w*/i,
  /\bkill\s*(myself|yourself)\b/i, /\bsuicid\w*/i, /\bend\s+it\s+all\b/i,
];

export function keywordModerate(text: string): ModerationVerdict {
  const hit = PROFANITY_PATTERNS.find((re) => re.test(text));
  if (hit) {
    const selfHarm = /(suicid|kill\s*myself|end\s+it\s+all)/i.test(text);
    return {
      flagged: true,
      categories: [selfHarm ? 'self_harm' : 'profanity'],
      reason: `keyword fallback matched (${selfHarm ? 'self_harm' : 'profanity'}) because the AI filter was unavailable`,
      engine: 'keyword',
    };
  }
  return { flagged: false, categories: [], reason: 'keyword fallback clean (AI unavailable)', engine: 'keyword' };
}

/**
 * The one and only gate on publication.
 * AI verdict if the provider works; otherwise keyword fallback.
 * Never throws — a broken filter must not lose an aspiration.
 */
export async function moderateAspiration(text: string, provider: AiProvider | null): Promise<ModerationVerdict> {
  if (!provider) return keywordModerate(text);
  try {
    return await provider.moderate(text);
  } catch (err) {
    console.warn('[ai] moderation failed, using keyword fallback:', err instanceof Error ? err.message : err);
    return keywordModerate(text);
  }
}
