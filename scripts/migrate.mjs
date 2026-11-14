// Runs db/migrations/*.sql in order, tracking applied files in _migrations.
// Usage: DATABASE_URL=postgres://... node scripts/migrate.mjs
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required (use the Neon pooled connection string).');
  process.exit(1);
}

const dir = path.join(process.cwd(), 'db', 'migrations');
const client = new pg.Client({ connectionString: url });
await client.connect();

await client.query(`CREATE TABLE IF NOT EXISTS _migrations (
  filename text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
)`);

const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
const { rows } = await client.query('SELECT filename, checksum FROM _migrations');
const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

for (const file of files) {
  const sql = await readFile(path.join(dir, file), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const seen = applied.get(file);
  if (seen) {
    if (seen !== checksum) {
      console.error(`Checksum mismatch for already-applied migration ${file}. Refusing to re-apply.`);
      process.exit(1);
    }
    console.log(`skip  ${file} (already applied)`);
    continue;
  }
  console.log(`apply ${file} ...`);
  try {
    await client.query(sql);
    await client.query('INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)', [file, checksum]);
    console.log(`ok    ${file}`);
  } catch (err) {
    console.error(`FAILED ${file}: ${err.message}`);
    process.exit(1);
  }
}

await client.end();
console.log('Migrations complete.');
