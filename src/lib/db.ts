/**
 * Database access layer.
 *
 * One Neon project serves dev and prod (deliberate — see README § Shared database).
 * Every transaction sets the GUCs below, which is what makes the RLS policies in
 * db/migrations/0002_rls.sql enforce per-tree isolation even for the table-owner
 * connection Neon hands out (FORCE ROW LEVEL SECURITY).
 *
 * GUC contract:
 *   app.current_tree — uuid of the scoped tree ('' when service scope)
 *   app.user_id      — Clerk user id, '' for anonymous
 *   app.role         — 'anonymous' | 'visitor' | 'owner' | 'moderator' | 'super_admin'
 *   app.mode         — 'request' | 'service' | 'bootstrap'
 * Never derive these from user input; role is resolved from users/tree_members.
 */
import { Pool, type PoolClient } from '@neondatabase/serverless';
import type { AuthContext, TreeRole, TreeSummary } from './types';

let pool: Pool | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL ?? 'postgresql://neondb_owner:npg_nLVm1U7gAiYl@ep-lucky-poetry-bewcmcfc-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  if (!url) throw new Error('DATABASE_URL is not set (Neon pooled connection string). See README § Environment variables.');
  return url;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: connectionString(), max: 4 });
  }
  return pool;
}

const TREE_COLUMNS = `id, slug, name, tagline, access_mode, event_starts_at, event_ends_at,
  invite_enabled, theme, is_global, updated_at`;

function coerceTheme(t: unknown): TreeSummary['theme'] {
  return (t && typeof t === 'object' ? t : {}) as TreeSummary['theme'];
}

function mapTree(row: Record<string, unknown>): TreeSummary {
  return { ...(row as unknown as Omit<TreeSummary, 'theme'>), theme: coerceTheme(row.theme) };
}

async function setGucs(
  client: PoolClient,
  treeId: string | '',
  userId: string | '',
  role: string,
  mode: 'request' | 'service' | 'bootstrap',
) {
  await client.query(
    `SELECT set_config('app.current_tree', $1, true),
            set_config('app.user_id', $2, true),
            set_config('app.role', $3, true),
            set_config('app.mode', $4, true)`,
    [treeId, userId, role, mode],
  );
}

/** Run `fn` in one tree, with the caller's role resolved server-side. */
export async function withTree<T>(
  treeSlug: string,
  userId: string | null,
  fn: (client: PoolClient, ctx: AuthContext) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // 1) bootstrap scope: resolve slug -> id (reads trees only)
    await setGucs(client, '', '', 'anonymous', 'bootstrap');
    const treeRes = await client.query('SELECT id FROM trees WHERE slug = $1', [treeSlug]);
    const treeId: string | undefined = treeRes.rows[0]?.id;
    if (!treeId) {
      await client.query('ROLLBACK');
      throw new TreeNotFoundError(treeSlug);
    }
    // 2) resolve role: super_admin from users table, then tree membership
    await setGucs(client, treeId, userId ?? '', userId ? 'visitor' : 'anonymous', 'request');
    const role = await resolveTreeRole(client, treeId, userId);
    await setGucs(client, treeId, userId ?? '', role, 'request');
    const ctx: AuthContext = { userId, role, mode: 'request', treeId };
    const out = await fn(client, ctx);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* already aborted */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Service scope for webhooks/cron — all rows visible, no tree scoping. */
export async function withService<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await setGucs(client, '', '', 'super_admin', 'service');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

export class TreeNotFoundError extends Error {
  constructor(slug: string) {
    super(`Tree not found: ${slug}`);
    this.name = 'TreeNotFoundError';
  }
}

export async function getTreeBySlug(
  treeSlug: string,
  userId: string | null,
): Promise<{ tree: TreeSummary; ctx: AuthContext } | null> {
  try {
    return await withTree(treeSlug, userId, async (client, ctx) => {
      const res = await client.query(`SELECT ${TREE_COLUMNS} FROM trees WHERE slug = $1`, [treeSlug]);
      const row = res.rows[0];
      return row ? { tree: mapTree(row), ctx } : null;
    });
  } catch (err) {
    if (err instanceof TreeNotFoundError) return null;
    throw err;
  }
}

export async function getGlobalTree(
  userId: string | null,
): Promise<{ tree: TreeSummary; ctx: AuthContext } | null> {
  return getTreeBySlug('global', userId);
}

/** Role of a user against one tree. Caller must already be inside the scoped tx. */
export async function resolveTreeRole(
  client: PoolClient,
  treeId: string,
  userId: string | null,
): Promise<TreeRole> {
  if (!userId) return 'anonymous';
  const u = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
  const globalRole: string = u.rows[0]?.role ?? 'visitor';
  if (globalRole === 'super_admin') return 'super_admin';
  const m = await client.query(
    'SELECT role FROM tree_members WHERE tree_id = $1 AND user_id = $2',
    [treeId, userId],
  );
  const memberRole = m.rows[0]?.role as string | undefined;
  if (memberRole === 'owner' || memberRole === 'moderator') return memberRole;
  return 'visitor';
}
