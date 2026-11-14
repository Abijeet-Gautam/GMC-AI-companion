/**
 * Clerk integration helpers.
 *
 * Sign-in methods are configured host-side in the Clerk dashboard:
 * email/password, Google, and GitHub. Roles are NOT stored in Clerk —
 * the source of truth is the Postgres `users.role` column (synced via
 * /api/webhooks/clerk, with a lazy upsert fallback here) so RLS can rely on it.
 */
import { auth, currentUser } from '@clerk/nextjs/server';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Upsert the Clerk user into Postgres. Called on authenticated write paths.
 * Skips the Clerk API call when the row was synced within the last hour.
 */
export async function ensureUser(
  query: (text: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>,
  userId: string,
): Promise<void> {
  const existing = await query('SELECT updated_at FROM users WHERE id = $1', [userId]);
  const updatedAt = existing.rows[0]?.updated_at ? new Date(existing.rows[0]!.updated_at as string) : null;
  if (updatedAt && Date.now() - updatedAt.getTime() < 60 * 60 * 1000) return;

  const u = await currentUser();
  if (!u) return;
  const email = u.emailAddresses[0]?.emailAddress ?? '';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || 'Guest';
  const avatar = u.imageUrl ?? null;
  await query(
    `INSERT INTO users (id, email, display_name, avatar_url, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           avatar_url = EXCLUDED.avatar_url,
           updated_at = now()`,
    [userId, email, name, avatar],
  );
}

/** sha256 hex helper. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Hash the raw invite token for storage/comparison. */
export function hashInviteToken(token: string): string {
  return sha256(`wt-invite:${token}`);
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Extract client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip')?.trim() ?? '0.0.0.0';
}

const IP_SALT = process.env.IP_HASH_SALT ?? 'wishing-tree-dev-salt-change-me';

export function hashIp(ip: string): string {
  return sha256(`ip:${IP_SALT}:${ip}`);
}

export function hashUa(ua: string | null): string {
  return sha256(`ua:${IP_SALT}:${ua ?? 'unknown'}`);
}

/**
 * Opaque visitor key for rate limiting anonymous traffic:
 * combines a device cookie with hashed IP + user-agent. Rotating the cookie
 * invalidates the key, which is acceptable (it only affects rate limiting).
 */
export function anonymousRateKey(deviceCookie: string, ipHash: string, uaHash: string): string {
  return `anon:${sha256(`rl:${deviceCookie}:${ipHash}:${uaHash}`)}`;
}

export const DEVICE_COOKIE = 'wt_vid';
