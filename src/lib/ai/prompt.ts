/** Shared prompts + a forgiving JSON extractor (models fence their output). */

export const MODERATION_SYSTEM_PROMPT = [
  'You are the content gate for a public "wishing tree" where strangers post short',
  'aspirations, hopes, and intentions (max ~480 chars). The display is in a lobby/venue.',
  'Decide whether the text is safe to publish publicly.',
  '',
  'Flag it when it contains: profanity or slur abuse, hate or harassment directed at a',
  'person/group, sexual content, credible threats or incitement of violence, or clear',
  'self-harm statements that need a human to see them.',
  'Do NOT flag: sincere hopes, even imperfect grammar, religious or political',
  'aspirations stated respectfully, mild sadness ("I hope to stop feeling worthless" is',
  'about the author themselves — flag ONLY if it reads as imminent danger).',
  '',
  'Reply with ONLY compact JSON, no prose:',
  '{"flagged": boolean, "categories": string[], "reason": string}',
  'categories ⊆ ["profanity","hate","harassment","sexual","violence","self_harm","spam"].',
].join('\n');

export const COMPOSE_SYSTEM_PROMPT = [
  'You are a warm, wise companion writing to someone who just added their aspiration to a',
  'public wishing tree. Write ONE short paragraph (2–3 sentences, <= 60 words) that is',
  'specific to THEIR aspiration — not generic cheerleading. Then list up to 3 real,',
  'well-known sources that informed the sentiment (poems, books, essays, speeches).',
  'Every source MUST be a real work by a real author and include a valid public URL',
  '(publisher, library, or archive page). Never invent URLs; if you are unsure of a URL,',
  'omit the url field instead of guessing.',
  '',
  'Reply with ONLY compact JSON, no prose:',
  '{"message": string, "sources": [{"title": string, "source": string, "url": string}]}',
].join('\n');

/** Extract the first balanced {...} block and JSON.parse it. Throws on failure. */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced?.[1] ?? raw).trim();
  const start = text.indexOf('{');
  if (start === -1) throw new Error('AI response contained no JSON object');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  throw new Error('AI response had unbalanced JSON');
}

export interface RawModerationJson {
  flagged?: unknown;
  categories?: unknown;
  reason?: unknown;
}

export function normalizeModerationJson(raw: unknown): { flagged: boolean; categories: string[]; reason: string } {
  const obj = (raw ?? {}) as RawModerationJson;
  const flagged = Boolean(obj.flagged);
  const categories = Array.isArray(obj.categories) ? obj.categories.map(String) : [];
  const reason = typeof obj.reason === 'string' ? obj.reason.slice(0, 280) : 'flagged by model';
  return { flagged, categories, reason };
}

export function normalizeComposeJson(raw: unknown): {
  message: string;
  sources: Array<{ title: string; source: string; url?: string | null }>;
} {
  const obj = (raw ?? {}) as { message?: unknown; sources?: unknown };
  const message = typeof obj.message === 'string' ? obj.message.trim().slice(0, 800) : '';
  if (!message) throw new Error('AI returned an empty message');
  const sources = Array.isArray(obj.sources)
    ? obj.sources
        .slice(0, 3)
        .map((s) => {
          const o = (s ?? {}) as Record<string, unknown>;
          return {
            title: String(o.title ?? '').trim().slice(0, 200),
            source: String(o.source ?? '').trim().slice(0, 200),
            url: typeof o.url === 'string' && o.url.trim().startsWith('http') ? o.url.trim().slice(0, 500) : null,
          };
        })
        .filter((s) => s.title && s.source)
    : [];
  return { message, sources };
}
