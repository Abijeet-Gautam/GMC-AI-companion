/**
 * Background message pipeline — runs AFTER the submit response is sent
 * (via next/server after() or a fire-and-forget promise).
 *
 *   aspiration ──► AI compose ──► verifySources ──► ready + verified citations
 *        │             │              │
 *        │             └─ fail ──► curated reflection + curated source (ai_commentary=true)
 *        └── AI down ──► curated reflection + curated source
 *
 * The visitor never waits for this; /api/leaves/[id]/message reports readiness.
 */
import { getAiProvider } from './provider';
import { verifySources, searchDomainMatchFactory } from './verify';
import { pickCuratedQuote } from '@/data/quotes';
import { withService } from '@/lib/db';
import { publishRealtime } from '@/lib/realtime';
import type { SourceCitation } from '@/lib/types';

export async function generateMessageForLeaf(leafId: string): Promise<void> {
  const ctx = await withService(async (client) => {
    const { rows } = await client.query(
      `SELECT l.id, l.body, l.tree_id, l.message_status FROM leaves l WHERE l.id = $1`,
      [leafId],
    );
    const leaf = rows[0] as { id: string; body: string; tree_id: string; message_status: string } | undefined;
    if (!leaf || leaf.message_status === 'ready') return null;
    return leaf;
  });
  if (!ctx) return;

  const provider = getAiProvider();
  let message: string | null = null;
  let sources: SourceCitation[] = [];
  let commentary = false;
  let status: 'ready' | 'failed' = 'ready';

  if (provider) {
    try {
      const composed = await provider.compose({ aspiration: ctx.body });
      const searchDomainMatch = await searchDomainMatchFactory(process.env);
      const verified = await verifySources(composed.sources, {
        searchDomainMatch,
        cacheRead: async (urlHash) => {
          const r = await withService((c) =>
            c.query(`SELECT ok FROM source_verifications WHERE url_hash = $1 AND checked_at > now() - interval '24 hours'`, [urlHash]),
          );
          const row = r.rows[0] as { ok: boolean } | undefined;
          return row ? row.ok : null;
        },
        cacheWrite: async (urlHash, ok) => {
          await withService((c) =>
            c.query(
              `INSERT INTO source_verifications (url_hash, ok) VALUES ($1, $2)
               ON CONFLICT (url_hash) DO UPDATE SET ok = EXCLUDED.ok, checked_at = now()`,
              [urlHash, ok],
            ),
          );
        },
      });
      if (verified.length > 0) {
        message = composed.message;
        sources = verified;
      } else {
        // Sources failed verification (or none returned): curated citation, AI text as commentary.
        message = composed.message;
        sources = curatedSources(ctx.body);
        commentary = true;
      }
    } catch (err) {
      console.warn('[ai] compose failed, using curated fallback:', err instanceof Error ? err.message : err);
    }
  }

  if (message === null) {
    const quote = pickCuratedQuote(ctx.body);
    message = `May this wish find its season. ${quote.text}`;
    sources = [{ title: quote.work, source: quote.author, url: null }];
    commentary = true;
    status = 'ready'; // curated fallback is still a complete, honest answer
  }

  await withService(async (client) => {
    await client.query(
      `UPDATE leaves
          SET ai_message = $2, ai_sources = $3, ai_commentary = $4, message_status = $5, updated_at = now()
        WHERE id = $1`,
      [ctx.id, message, JSON.stringify(sources), commentary, status],
    );
    await client.query(
      `INSERT INTO tree_events (tree_id, kind, payload) VALUES ($1, 'leaf.message', $2)`,
      [ctx.tree_id, JSON.stringify({ id: ctx.id })],
    );
  });

  await publishRealtime(ctx.tree_id, { kind: 'leaf.message', payload: { id: leafId } });
}

function curatedSources(aspiration: string): SourceCitation[] {
  const quote = pickCuratedQuote(aspiration);
  return [{ title: quote.work, source: quote.author, url: null }];
}
