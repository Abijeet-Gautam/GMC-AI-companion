/**
 * Realtime transport.
 *
 * Chosen approach: Server-Sent Events + Postgres polling as the default,
 * because it works on Vercel serverless with Neon and adds zero new vendors.
 * The tree screen holds an EventSource to /api/stream; that route polls
 * tree_events (written inside the same transaction as every mutation) every
 * 1.5s and forwards rows. EventSource auto-reconnects past maxDuration.
 *
 * For high-concurrency screens (hundreds of viewers), set REALTIME_PROVIDER=ably
 * and ABLY_API_KEY — publishes then go straight to Ably, which the client
 * subscribes to via /api/ably-token. Same event schema either way.
 *
 * SSE clients poll Postgres; Ably clients get pushed events. Both get every event.
 */
import type { PoolClient } from '@neondatabase/serverless';

export type RealtimeProviderName = 'sse' | 'ably';

export function realtimeProviderName(): RealtimeProviderName {
  return process.env.REALTIME_PROVIDER === 'ably' ? 'ably' : 'sse';
}

export interface RealtimeEvent {
  kind:
    | 'leaf.created'
    | 'leaf.updated'
    | 'leaf.hidden'
    | 'leaf.removed'
    | 'leaf.restored'
    | 'leaf.message'
    | 'studio.updated';
  payload: Record<string, unknown>;
}

/** Fire-and-forget publish to Ably when configured; SSE path needs nothing (polling reads the table). */
export async function publishRealtime(treeId: string, event: RealtimeEvent): Promise<void> {
  if (realtimeProviderName() !== 'ably') return;
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.warn('[realtime] REALTIME_PROVIDER=ably but ABLY_API_KEY is unset; event not pushed');
    return;
  }
  try {
    const { Rest } = await import('ably');
    const rest = new Rest(apiKey);
    await rest.channels.get(`tree:${treeId}`).publish(event.kind, event.payload);
  } catch (err) {
    // Never fail the request because realtime push failed — SSE pollers still get there.
    console.error('[realtime] Ably publish failed:', err instanceof Error ? err.message : err);
  }
}

/** Read back events newer than `sinceId` (used by the SSE poll). */
export async function readTreeEvents(
  client: PoolClient,
  treeId: string,
  sinceId: number,
  limit = 100,
): Promise<Array<{ id: number; kind: string; payload: unknown; created_at: string }>> {
  const { rows } = await client.query(
    `SELECT id, kind, payload, created_at
       FROM tree_events
      WHERE tree_id = $1 AND id > $2
      ORDER BY id ASC
      LIMIT $3`,
    [treeId, sinceId, limit],
  );
  return rows as Array<{ id: number; kind: string; payload: unknown; created_at: string }>;
}

/** Insert a studio/manual event (leaf events are inserted inside SQL functions). */
export async function insertTreeEvent(
  client: PoolClient,
  treeId: string,
  kind: RealtimeEvent['kind'],
  payload: Record<string, unknown>,
): Promise<number> {
  const { rows } = await client.query(
    'INSERT INTO tree_events (tree_id, kind, payload) VALUES ($1, $2, $3) RETURNING id',
    [treeId, kind, JSON.stringify(payload)],
  );
  return Number(rows[0]!.id);
}
