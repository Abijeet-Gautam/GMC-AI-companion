import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Drop everything in reverse dependency order
    await client.query('DROP INDEX IF EXISTS leaves_flagged_queue;');
    await client.query('DROP INDEX IF EXISTS leaves_author;');
    await client.query('DROP INDEX IF EXISTS leaves_tree_created;');
    await client.query('DROP INDEX IF EXISTS leaves_tree_status_position;');
    await client.query('DROP TABLE IF EXISTS leaves CASCADE;');
    await client.query('DROP TYPE IF EXISTS leaf_status CASCADE;');
    await client.query('DROP TABLE IF EXISTS leaf_meta CASCADE;');
    await client.query('DROP TABLE IF EXISTS rate_limits CASCADE;');
    await client.query('DROP TABLE IF EXISTS tree_events CASCADE;');
    await client.query('DROP TABLE IF EXISTS source_verifications CASCADE;');
    await client.query('DROP TABLE IF EXISTS trees CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    await client.query('DROP TABLE IF EXISTS tree_members CASCADE;');
    
    await client.query('COMMIT');
    console.log('Schema reset complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error resetting schema:', err);
  } finally {
    client.release();
  }
}

resetSchema();