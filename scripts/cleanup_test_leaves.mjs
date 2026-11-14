// Removes leaves created by test runs and manual probes, then restores the
// dense 1..N published ranking that `submit_leaf()` maintains.
//
// Usage:
//   node --env-file=.env scripts/cleanup_test_leaves.mjs           # dry run
//   node --env-file=.env scripts/cleanup_test_leaves.mjs --apply   # delete
import pg from 'pg';

const apply = process.argv.includes('--apply');

// Exact ids from Playwright runs and direct probes.
const IDS = [
  'd62587da-9d26-47b2-a82c-9265d77c1f90',
  '7d06d0f1-d0b5-43a7-b034-08d6b5571fc3',
  '99cc357c-1677-452e-9094-38dbb9fb136a',
  '643ae6de-cff2-437f-9df3-6e7f2e5eb10e',
];

// Every run stamps a fresh wish text, so match the prefixes rather than one body.
const PATTERNS = ['Playwright audit wish%', 'Probe wish %', 'verify_db probe%'];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required (run with --env-file=.env).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const { rows: targets } = await client.query(
  `SELECT l.id, l.tree_id, l.position, l.status, l.created_at,
          (m.leaf_id IS NOT NULL) AS anonymous_meta,
          left(l.body, 72) AS body
     FROM leaves l
     LEFT JOIN leaf_meta m ON m.leaf_id = l.id
    WHERE l.id = ANY($1::uuid[])
       OR l.body LIKE ANY($2::text[])
    ORDER BY l.tree_id, l.position`,
  [IDS, PATTERNS],
);

if (targets.length === 0) {
  console.log('No test leaves found — nothing to do.');
} else {
  console.log(`${apply ? 'Deleting' : 'Would delete'} ${targets.length} leaf/leaves:`);
  for (const t of targets) {
    const stamp = new Date(t.created_at).toISOString().slice(0, 16).replace('T', ' ');
    console.log(`  ${t.id}  pos=${t.position}  ${stamp}  anon=${t.anonymous_meta}  ${t.body}`);
  }
}

if (apply && targets.length > 0) {
  const ids = targets.map((t) => t.id);
  await client.query('BEGIN');
  try {
    // `leaf_meta` cascades from `leaves`. Events carry the leaf id in JSON.
    await client.query(
      `DELETE FROM tree_events
        WHERE kind LIKE 'leaf.%'
          AND payload->>'id' = ANY($1::text[])`,
      [ids],
    );
    const { rowCount } = await client.query('DELETE FROM leaves WHERE id = ANY($1::uuid[])', [ids]);
    console.log(`\nDeleted ${rowCount} leaf/leaves and their events.`);

    // Re-densify: `hide_leaf()` does the same by decrementing, but a bulk edit
    // is cheaper and correct even when several leaves disappear at once.
    const { rowCount: renumbered } = await client.query(
      `WITH ranked AS (
         SELECT id, row_number() OVER (
                  PARTITION BY tree_id ORDER BY position, created_at, id
                ) AS rn
           FROM leaves
          WHERE status = 'published'
       )
       UPDATE leaves l
          SET position = r.rn
         FROM ranked r
        WHERE l.id = r.id
          AND l.position IS DISTINCT FROM r.rn`,
    );
    console.log(`Renumbered ${renumbered} published position(s).`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed, nothing changed:', err);
    await client.end();
    process.exit(1);
  }
}

const { rows: tree } = await client.query(
  `SELECT t.id,
          count(*) FILTER (WHERE l.status = 'published')::int AS published,
          max(l.position) FILTER (WHERE l.status = 'published') AS max_position
     FROM trees t
     LEFT JOIN leaves l ON l.tree_id = t.id
    WHERE t.is_global
    GROUP BY t.id`,
);

if (tree[0]) {
  const { published, max_position } = tree[0];
  const dense = published === 0 || published === Number(max_position);
  console.log(
    `\nGlobal tree ${tree[0].id}: ${published} published, highest position ${max_position ?? 0} — ${
      dense ? 'dense' : 'GAPS REMAIN'
    }.`,
  );
  if (!dense) process.exitCode = 1;
}

await client.end();
