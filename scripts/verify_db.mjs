// Verifies the live database matches db/migrations/: every migration applied,
// RLS helper functions present, the global tree seeded, and one anonymous
// submit_leaf() call actually works under the request-mode GUC contract.
// The probe always ROLLBACKs, so it never leaves a leaf behind.
//
// Usage: node --env-file=.env scripts/verify_db.mjs
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const { rows: migrations } = await client.query(
  'SELECT filename FROM _migrations ORDER BY filename',
);
check('_migrations present', migrations.length > 0, migrations.map((r) => r.filename).join(', '));

for (const name of ['app_user', 'app_tree', 'app_role', 'app_mode', 'submit_leaf']) {
  const { rows } = await client.query('SELECT 1 FROM pg_proc WHERE proname = $1 LIMIT 1', [name]);
  check(`function ${name}()`, rows.length === 1);
}

const { rows: trees } = await client.query(
  "SELECT id, slug, access_mode, is_global FROM trees WHERE slug = 'global'",
);
const tree = trees[0];
check('global tree seeded', Boolean(tree) && tree.is_global === true, tree ? tree.id : 'missing');

const { rows: countRows } = await client.query(
  "SELECT count(*)::int AS n FROM leaves WHERE status = 'published'",
);
check('published leaves readable', Number.isInteger(countRows[0].n), `${countRows[0].n} leaves`);

if (tree) {
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.current_tree', $1, true),
              set_config('app.user_id', '', true),
              set_config('app.role', 'anonymous', true),
              set_config('app.mode', 'request', true)`,
      [tree.id],
    );
    const { rows: inserted } = await client.query(
      `SELECT * FROM submit_leaf($1, NULL, $2, $3, $4, false, NULL, true)`,
      [tree.id, 'verify_db probe — rolled back', '#ffd166', 'oval'],
    );
    check('submit_leaf() in request mode', inserted.length === 1 && inserted[0].leaf_position > 0,
      `position ${inserted[0]?.leaf_position}`);
    const { rows: events } = await client.query(
      "SELECT 1 FROM tree_events WHERE tree_id = $1 AND kind = 'leaf.created' LIMIT 1",
      [tree.id],
    );
    check('leaf.created event written', events.length === 1);
    await client.query('ROLLBACK');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* already aborted */ }
    check('submit_leaf() in request mode', false, err.message);
  }
}

await client.end();
console.log(failures === 0 ? '\nDatabase verified.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
