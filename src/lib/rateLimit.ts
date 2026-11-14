/**
 * Rate limiting — sliding window over the rate_limits table.
 *
 * How the key is chosen (see README § Rate limiting):
 *   signed in  -> 'u:<clerk user id>'
 *   anonymous  -> 'anon:<sha256(deviceCookie + ipHash + uaHash)>'
 *
 * The device cookie (wt_vid) is httpOnly, set by the server on first contact.
 * IP/UA are only ever stored as salted hashes, and those hashes are purged
 * after 24h (leaf_meta) / rows purged after 7 days (rate_limits).
 */
import type { PoolClient } from '@neondatabase/serverless';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
  bucket: 'submit' | 'api';
}

export const SUBMIT_POLICY: RateLimitPolicy = {
  limit: Number(process.env.SUBMIT_RATE_LIMIT ?? 6),
  windowSeconds: Number(process.env.SUBMIT_RATE_WINDOW_SECONDS ?? 600), // 10 min
  bucket: 'submit',
};

/** Count rows in the window, then record this hit. One transaction. */
export async function checkAndRecordRateLimit(
  client: PoolClient,
  key: string,
  treeId: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n
       FROM rate_limits
      WHERE key = $1 AND bucket = $2
        AND created_at > now() - make_interval(secs => $3)`,
    [key, policy.bucket, policy.windowSeconds],
  );
  const count: number = rows[0]?.n ?? 0;
  if (count >= policy.limit) {
    return { allowed: false, count, limit: policy.limit, retryAfterSeconds: policy.windowSeconds };
  }
  await client.query(
    `INSERT INTO rate_limits (key, tree_id, bucket) VALUES ($1, $2, $3)`,
    [key, treeId, policy.bucket],
  );
  return { allowed: true, count: count + 1, limit: policy.limit, retryAfterSeconds: 0 };
}
