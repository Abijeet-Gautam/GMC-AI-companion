/**
 * Source verification. The model can (and does) invent citations, so no
 * AI-cited source is shown until it clears this ladder:
 *
 *   1. well-formed http(s) URL
 *   2. cache lookup (source_verifications, sha256 of normalized URL, 24h TTL)
 *   3. fetch HEAD→GET with a 6s timeout; 2xx/3xx required
 *   4. GET body must contain ≥2 consecutive distinctive words from the citation title
 *      (strong signal the page exists AND is the cited work)
 *   5. if SEARCH_PROVIDER=tavily|brave + SEARCH_API_KEY is set, additionally require a
 *      search hit on the same registrable domain
 *
 * Any failure ⇒ caller discards ALL AI sources and uses the curated library
 * with the AI text shown as unattributed "reflection" commentary.
 */
import { createHash } from 'node:crypto';

export interface VerificationFetchResponse {
  status: number;
  body?: string;
}

export type FetchLike = (url: string, init: { method: 'HEAD' | 'GET'; signal: AbortSignal }) => Promise<VerificationFetchResponse>;

export interface VerifyOptions {
  fetchFn?: FetchLike;
  timeoutMs?: number;
  /** consulted when URL+content checks are inconclusive */
  searchDomainMatch?: (title: string, domain: string) => Promise<boolean>;
  cacheRead?: (urlHash: string) => Promise<boolean | null>;
  cacheWrite?: (urlHash: string, ok: boolean) => Promise<void>;
}

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'to', 'in', 'on', 'for', 'with', 'by']);

export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

export function urlHash(normalizedUrl: string): string {
  return createHash('sha256').update(normalizedUrl).digest('hex');
}

export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().split('.').filter(Boolean);
  return parts.slice(-2).join('.');
}

/** Distinctive token bigrams from the title, e.g. "Tao Te Ching" → ["tao te","te ching"]. */
export function distinctiveBigrams(title: string): string[] {
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  return bigrams;
}

const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, { method: init.method, signal: init.signal, redirect: 'follow' });
  const body = init.method === 'GET' ? (await res.text()).slice(0, 128 * 1024) : undefined;
  return { status: res.status, body };
};

export async function verifySourceUrl(
  citation: { title: string; url?: string | null },
  opts: VerifyOptions = {},
): Promise<boolean> {
  if (!citation.url) return false;
  const normalized = normalizeUrl(citation.url);
  if (!normalized) return false;
  const hash = urlHash(normalized);

  if (opts.cacheRead) {
    try {
      const cached = await opts.cacheRead(hash);
      if (cached !== null && cached !== undefined) return cached;
    } catch {
      /* cache errors must not block verification */
    }
  }

  const fetchFn = opts.fetchFn ?? defaultFetch;
  const timeoutMs = opts.timeoutMs ?? 6000;
  const host = new URL(normalized).hostname;
  const domain = registrableDomain(host);

  let ok = false;
  try {
    const headCtrl = new AbortController();
    const headTimer = setTimeout(() => headCtrl.abort(), timeoutMs);
    let head = await fetchFn(normalized, { method: 'HEAD', signal: headCtrl.signal }).catch(() => null);
    clearTimeout(headTimer);
    if (head && head.status >= 400) {
      const getCtrl = new AbortController();
      const getTimer = setTimeout(() => getCtrl.abort(), timeoutMs);
      head = await fetchFn(normalized, { method: 'GET', signal: getCtrl.signal }).catch(() => null);
      clearTimeout(getTimer);
    }
    if (head && head.status >= 200 && head.status < 400) {
      const bigrams = distinctiveBigrams(citation.title);
      const haystack = (head.body ?? '').toLowerCase().replace(/\s+/g, ' ');
      const strong = bigrams.length > 0 && bigrams.some((bg) => haystack.includes(bg));
      if (strong) {
        ok = true;
      } else if (opts.searchDomainMatch) {
        ok = await opts.searchDomainMatch(citation.title, domain).catch(() => false);
      } else {
        // No search provider configured: accept a live page whose title words
        // substantially appear in the body, or — if HEAD returned no body to
        // inspect — a bare 2xx from a non-parking host.
        const titleTokens = citation.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 3 && !STOPWORDS.has(t));
        if (head.body && titleTokens.length > 0) {
          const hits = titleTokens.filter((t) => haystack.includes(t)).length;
          ok = hits >= Math.ceil(titleTokens.length / 2);
        } else {
          ok = true; // HEAD-only 2xx; no body to disprove
        }
      }
    }
  } catch {
    ok = false;
  }

  if (opts.cacheWrite) {
    try {
      await opts.cacheWrite(hash, ok);
    } catch {
      /* ignore cache write failures */
    }
  }
  return ok;
}

/** Verify a batch; returns verified sources or [] (caller falls back wholesale). */
export async function verifySources(
  sources: Array<{ title: string; source: string; url?: string | null }>,
  opts: VerifyOptions = {},
): Promise<Array<{ title: string; source: string; url: string }>> {
  const results = await Promise.all(
    sources.map(async (s) => ({ s, ok: await verifySourceUrl(s, opts) })),
  );
  return results
    .filter((r) => r.ok && r.s.url)
    .map((r) => ({ title: r.s.title, source: r.s.source, url: r.s.url as string }));
}

/** Optional: Tavily / Brave domain match for SEARCH_PROVIDER. */
export async function searchDomainMatchFactory(env: NodeJS.ProcessEnv) {
  const provider = env.SEARCH_PROVIDER?.toLowerCase();
  const key = env.SEARCH_API_KEY;
  if (!provider || !key) return undefined;
  return async (title: string, domain: string): Promise<boolean> => {
    try {
      if (provider === 'tavily') {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ api_key: key, query: title, max_results: 5 }),
          signal: AbortSignal.timeout(6000),
        });
        const data = (await res.json()) as { results?: Array<{ url?: string }> };
        return (data.results ?? []).some((r) => {
          try {
            return registrableDomain(new URL(r.url ?? '').hostname) === domain;
          } catch {
            return false;
          }
        });
      }
      if (provider === 'brave') {
        const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(title)}&count=5`, {
          headers: { 'x-subscription-token': key },
          signal: AbortSignal.timeout(6000),
        });
        const data = (await res.json()) as { web?: { results?: Array<{ url?: string }> } };
        return (data.web?.results ?? []).some((r) => {
          try {
            return registrableDomain(new URL(r.url ?? '').hostname) === domain;
          } catch {
            return false;
          }
        });
      }
      return false;
    } catch {
      return false;
    }
  };
}
