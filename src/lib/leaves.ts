/** Leaf-level queries shared by routes and pages. */
import type { PoolClient } from '@neondatabase/serverless';
import type { Leaf } from './types';

const LEAF_PUBLIC_COLUMNS = `id, tree_id, author_id, body, status, position, color, leaf_shape,
  flagged, ai_message, ai_sources, ai_commentary, message_status, created_at`;

export async function getPublishedLeaves(
  client: PoolClient,
): Promise<Array<{ id: string; position: number; color: string | null; leaf_shape: string | null; created_at: string }>> {
  const { rows } = await client.query(
    `SELECT id, position, color, leaf_shape, created_at
       FROM leaves
      WHERE status = 'published'
      ORDER BY position ASC`,
  );
  return rows as Array<{ id: string; position: number; color: string | null; leaf_shape: string | null; created_at: string }>;
}

export async function getLeafById(client: PoolClient, leafId: string): Promise<Leaf | null> {
  const { rows } = await client.query(
    `SELECT ${LEAF_PUBLIC_COLUMNS} FROM leaves WHERE id = $1`,
    [leafId],
  );
  return (rows[0] as Leaf) ?? null;
}

export async function getLeafCount(client: PoolClient): Promise<number> {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM leaves WHERE status = 'published'`,
  );
  return rows[0]?.n ?? 0;
}

/** Minimal payload the /api/leaves route and the canvas need. */
export async function getTreeState(client: PoolClient) {
  const leaves = await getPublishedLeaves(client);
  return { leaves, count: leaves.length };
}
