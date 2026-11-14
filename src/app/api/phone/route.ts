import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { withTree } from '@/lib/db';
import type { TreeSummary } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /phone?tree=global  — landing page with two tabs
export async function GET(_req: NextRequest) {
  const userId = await getUserId();
  const treeSlug = _req.nextUrl.searchParams.get('tree') ?? 'global';

  try {
    const treeInfo = await getGlobalTree(userId);
    return NextResponse.json({ userId, tree: treeInfo }, {
      headers: { 'cache-control': 'no-store, must-revalidate' },
    });
  } catch (err) {
    if ((err as Error).name === 'TreeNotFoundError') {
      return NextResponse.json({ error: 'Tree not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unavailable.' }, { status: 500 });
  }
}

// POST /phone — submit aspiration from first-timer tab
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  const body = await req.json();
  const ip = _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
  const userAgent = _req.headers.get('user-agent') ?? '';
  const deviceCookie = _req.cookies.get('wt_vid')?.value ?? null;

  const outcome = await submitAspiration({
    treeSlug: body.tree ?? 'global',
    body: body.aspiration ?? '',
    userId,
    ip,
    userAgent,
    deviceCookie,
    inviteToken: body.inviteToken ?? null,
  });

  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
  }

  const res = NextResponse.json({
    ok: true,
    leafId: outcome.leafId,
    leafPosition: outcome.leafPosition,
    published: outcome.published,
    flagged: outcome.flagged,
    messageStatus: outcome.messageStatus,
  });

  // Set device cookie for anonymous rate limiting if new
  if (outcome.newDeviceCookie) {
    res.cookies.set('wt_vid', outcome.newDeviceCookie, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365, path: '/',
    });
  }
  return res;
}

// GET /phone/me — returnee: show existing leaves for this signed-in user
export async function GET_ME(_req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ leaves: [] }, { headers: { 'cache-control': 'no-store' } });
  try {
    const state = await withTree('global', userId, async (client) => {
      const { rows } = await client.query(
        `SELECT id, leaf_position AS position, body, color, leaf_shape, status, created_at, ai_message, ai_commentary
           FROM leaves WHERE author_id = $1 AND tree_id = $2`,
        [userId, 'global'],
      );
      return rows as Array<{
        id: string; position: number | null; body: string; color: string | null;
        leaf_shape: string | null; status: string; created_at: string;
        ai_message: string | null; ai_commentary: boolean;
      }>;
    });
    return NextResponse.json({ leaves: state }, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('[api/phone/me] error:', err);
    return NextResponse.json({ error: 'Unavailable.' }, { status: 500 });
  }
}