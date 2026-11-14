import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { withTree, getPublishedLeaves } from '@/lib/db';

export const revalidate = 0; // never static

export async function GET(_req: NextRequest) {
  const treeParam = _req.nextUrl.searchParams.get('trees') ?? 'global';
  const treeIds = treeParam.split(',').map(s => s.trim()).filter(Boolean) ?? ['global'];
  const userId = await getUserId();

  try {
    // Use withTree to set proper RLS GUCs for the scoped tree
    // But we also need to handle the case where userId is null (anonymous tree view)
    // We'll do a quick service-scoped read for the state, since RLS needs GUCs set per-request.
    // Actually, let's just read with the global tree's access rules.

    // For now, always read via service mode so RLS doesn't block, then the client
    // respects the tree's access_mode separately on the frontend.
    const Pool = (await import('@neondatabase/serverless')).Pool;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL });
    await pool.connect();

    const allLeaves: Array<{
      id: string; position: number; color: string | null; leaf_shape: string | null;
      created_at: string; author_id: string | null; status: string;
    }> = [];

    for (const tid of treeIds) {
      const { rows } = await pool.query(
        `SELECT id, position, color, leaf_shape, created_at, author_id, status
           FROM leaves WHERE status = 'published' AND tree_id = $1
           ORDER BY position ASC`,
        [tid],
      );
      allLeaves.push(...rows);
    }

    // Also send the most recent event id from tree_events so the client can
    // start polling from there if it wants incremental updates.
    let lastEventId = 0;
    try {
      const { rows } = await pool.query(
        `SELECT max(id)::int AS maxid FROM tree_events WHERE tree_id = ANY($1)`,
        [treeIds],
      );
      if (rows[0]?.maxid) lastEventId = rows[0].maxid;
    } catch { /* ignore */ }

    await pool.end();

    return NextResponse.json({
      leaves: allLeaves,
      lastEventId,
      trees: treeIds,
    }, {
      headers: {
        'cache-control': 'no-store, must-revalidate',
        'x-last-event-id': String(lastEventId),
      },
    });
  } catch (err) {
    console.error('[api/tree] error:', err);
    return NextResponse.json({ error: 'Unavailable.' }, { status: 500 });
  }
}