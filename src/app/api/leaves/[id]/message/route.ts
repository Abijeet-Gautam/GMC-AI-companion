import { NextRequest, NextResponse } from 'next/server';
import { withService } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public: the author polls this until the background pipeline finishes. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }
  try {
    const row = await withService(async (client) => {
      const { rows } = await client.query(
        `SELECT message_status, ai_message, ai_sources, ai_commentary, position, status
           FROM leaves WHERE id = $1`,
        [id],
      );
      return rows[0] as
        | {
            message_status: string;
            ai_message: string | null;
            ai_sources: unknown;
            ai_commentary: boolean;
            position: number;
            status: string;
          }
        | undefined;
    });
    if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    // Never expose anything for a leaf that isn't meant to be read yet.
    if (row.status !== 'published') {
      return NextResponse.json({ status: 'unavailable' }, { headers: { 'cache-control': 'no-store' } });
    }
    return NextResponse.json(
      {
        status: row.message_status,
        message: row.ai_message,
        sources: row.ai_sources ?? [],
        commentary: row.ai_commentary,
        position: row.position,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/message] failed:', err);
    return NextResponse.json({ error: 'Unavailable.' }, { status: 500 });
  }
}
