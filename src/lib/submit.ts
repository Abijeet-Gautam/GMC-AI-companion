import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from '@neondata/serverless';
import { withTree } from './db';
import { moderateAspiration } from './ai/provider';
import { getAiProvider } from './ai/provider';
import { anonymousRateKey, hashIp, hashUa, hashInviteToken, ensureUser } from './auth';
import { checkAndRecordRateLimit, SUBMIT_POLICY } from './rateLimit';
import type { TreeSummary } from './types';

export interface SubmitRequest {
  treeSlug: string;
  body: string;
  userId: string | null;
  ip: string;
  userAgent: string | null;
  deviceCookie: string | null;
  inviteToken?: string | null;
}

export type SubmitOutcome =
  | {
      ok: true;
      leafId: string;
      leafPosition: number | null; // null when held for moderation review
      published: boolean;
      flagged: boolean;
      messageStatus: 'pending' | 'skipped';
      /** caller should set this as the wt_vid cookie when present */
      newDeviceCookie?: string;
      tree: Pick<TreeSummary, 'id' | 'slug' | 'updated_at'>;
    }
  | { ok: false; status: 400 | 403 | 404 | 429; error: string; retryAfterSeconds?: number };

export const MAX_BODY = 480;

export function validateBody(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Please write your aspiration first.' };
  const body = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (body.length === 0) return { ok: false, error: 'Please write your aspiration first.' };
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` };
  return { ok: true, body };
}

export async function submitAspiration(req: SubmitRequest): Promise<SubmitOutcome> {
  const validated = validateBody(req.body);
  if (!validated.ok) return { ok: false, status: 400, error: validated.error };
  const body = validated.body;

  const deviceCookie = req.deviceCookie ?? randomBytes(16).toString('base64url');
  const isNewCookie = !req.deviceCookie;

  try {
    return await withTree(req.treeSlug, req.userId, async (client: PoolClient) => {
      // ---- load tree (access rules live on the row) ----
      const treeRes = await client.query(
        `SELECT id, slug, access_mode, event_starts_at, event_ends_at, invite_enabled, invite_token_hash, updated_at
           FROM trees WHERE slug = $1`,
        [req.treeSlug],
      );
      const tree = treeRes.rows[0] as
        | {
            id: string; slug: string; access_mode: string;
            event_starts_at: Date | null; event_ends_at: Date | null;
            invite_enabled: boolean; invite_token_hash: string | null; updated_at: Date;
          }
        | undefined;
      if (!tree) return { ok: false, status: 404, error: 'Tree not found.' };

      // ---- access control ----
      const accessError = checkAccess(tree, req.inviteToken);
      if (accessError) return { ok: false, status: 403, error: accessError };

      // ---- sync signed-in user (lazy; skips Clerk call if fresh) ----
      if (req.userId) {
        await ensureUser((text, params) => client.query(text, params as unknown[]), req.userId);
        // apply author style preference to leaf color if set
      }

      // ---- rate limit ----
      const ipHash = hashIp(req.ip);
      const uaHash = hashUa(req.userAgent);
      const key = req.userId
        ? `u:${req.userId}`
        : anonymousRateKey(deviceCookie, ipHash, uaHash);
      const rl = await checkAndRecordRateLimit(client, key, tree.id, SUBMIT_POLICY);
      if (!rl.allowed) {
        return {
          ok: false, status: 429,
          error: 'You’re tending the tree very quickly. Take a breath and try again in a few minutes.',
          retryAfterSeconds: rl.retryAfterSeconds,
        };
      }

      // ---- moderate (the only gate) ----
      const provider = getAiProvider();
      const verdict = await moderateAspiration(body, provider);
      const aiBlocked = verdict.engine === 'ai' && verdict.flagged;       // hold for review
      const keywordFlagged = verdict.engine === 'keyword' && verdict.flagged; // publish immediately + flag
      const flagged = verdict.flagged;
      const publish = !aiBlocked;

      // ---- pick author style prefs ----
      let color: string | null = null;
      let leafShape: string | null = null;
      if (req.userId) {
        const pref = await client.query('SELECT preferences FROM users WHERE id = $1', [req.userId]);
        const p = (pref.rows[0]?.preferences ?? {}) as { leafColor?: string; leafShape?: string };
        if (typeof p.leafColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(p.leafColor)) color = p.leafColor;
        if (typeof p.leafShape === 'string') leafShape = p.leafShape;
      }

      // ---- insert via SQL function (advisory-locked dense positioning) ----
      const { rows } = await client.query(
        `SELECT * FROM submit_leaf($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tree.id, req.userId, body, color, leafShape, flagged, (verdict.reason ?? '').slice(0, 280), publish],
      );
      const leafId: string | undefined = rows[0]?.id;
      const leafPosition: number | null = rows[0]?.leaf_position ?? null;  // <-- UPDATED: was position

      // ---- visitor identity for anonymous submissions (24h retention) ----
      if (!req.userId && leafId) {
        await client.query(
          `INSERT INTO leaf_meta (leaf_id, ip_hash, ua_hash) VALUES ($1, $2, $3)`,
          [leafId, ipHash, uaHash],
        );
      }

      return {
        ok: true as const,
        leafId: leafId!,
        leafPosition: leafPosition,  // <-- UPDATED: was position
        published: publish,
        flagged: flagged || keywordFlagged,
        messageStatus: publish ? ('pending' as const) : ('skipped' as const),
        ...(isNewCookie ? { newDeviceCookie: deviceCookie } : {}),
        tree: { id: tree.id, slug: tree.slug, updated_at: String(tree.updated_at) },
      };
    });
  } catch (err) {
    if ((err as Error).name === 'TreeNotFoundError') {
      return { ok: false, status: 404, error: 'Tree not found.' };
    }
    throw err;
  }
}