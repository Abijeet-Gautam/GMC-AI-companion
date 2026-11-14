import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Create enum type
    await client.query(`CREATE TYPE leaf_status AS ENUM ('published','hidden','removed')`);
    console.log('Created leaf_status enum');
    
    // 2. Create users table
    await client.query(`
      CREATE TABLE users (
        id text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        display_name text NOT NULL DEFAULT '',
        avatar_url text,
        role text NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor','owner','moderator','super_admin')),
        preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    console.log('Created users table');
    
    // 3. Create trees table
    await client.query(`
      CREATE TABLE trees (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        tagline text NOT NULL DEFAULT 'Every leaf is a wish.',
        owner_id text REFERENCES users(id) ON DELETE SET NULL,
        access_mode text NOT NULL DEFAULT 'open' CHECK (access_mode IN ('open','event_window','invite')),
        event_starts_at timestamptz,
        event_ends_at timestamptz,
        invite_token_hash text,
        invite_enabled boolean NOT NULL DEFAULT false,
        theme jsonb NOT NULL DEFAULT '{}'::jsonb,
        is_global boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    // Create the unique index for is_global
    await client.query(`CREATE UNIQUE INDEX trees_single_global ON trees (is_global) WHERE is_global`);
    console.log('Created trees table and index');
    
    // 4. Create tree_members table
    await client.query(`
      CREATE TABLE tree_members (
        tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL CHECK (role IN ('owner','moderator')),
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (tree_id, user_id)
      )
    `);
    console.log('Created tree_members table');
    
    // 5. Create leaves table
    await client.query(`
      CREATE TABLE leaves (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
        author_id text REFERENCES users(id) ON DELETE SET NULL,
        body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 480),
        status leaf_status NOT NULL DEFAULT 'published',
        position integer NOT NULL,
        color text,
        leaf_shape text,
        flagged boolean NOT NULL DEFAULT false,
        flag_reason text,
        hide_reason text,
        ai_message text,
        ai_sources jsonb,
        ai_commentary boolean NOT NULL DEFAULT false,
        message_status text NOT NULL DEFAULT 'pending' CHECK (message_status IN ('pending','ready','failed','skipped')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        edited_at timestamptz
      )
    `);
    await client.query(`CREATE INDEX leaves_tree_status_position ON leaves (tree_id, status, position)`);
    await client.query(`CREATE INDEX leaves_tree_created ON leaves (tree_id, created_at DESC)`);
    await client.query(`CREATE INDEX leaves_author ON leaves (author_id) WHERE author_id IS NOT NULL`);
    await client.query(`CREATE INDEX leaves_flagged_queue ON leaves (tree_id) WHERE flagged AND status = 'published'`);
    console.log('Created leaves table');
    
    // 6. Create leaf_meta table
    await client.query(`
      CREATE TABLE leaf_meta (
        leaf_id uuid PRIMARY KEY REFERENCES leaves(id) ON DELETE CASCADE,
        ip_hash text,
        ua_hash text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX leaf_meta_created ON leaf_meta (created_at)`);
    console.log('Created leaf_meta table');
    
    // 7. Create rate_limits table
    await client.query(`
      CREATE TABLE rate_limits (
        id bigserial PRIMARY KEY,
        key text NOT NULL,
        tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
        bucket text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX rate_limits_lookup ON rate_limits (key, bucket, created_at DESC)`);
    await client.query(`CREATE INDEX rate_limits_gc ON rate_limits (created_at)`);
    console.log('Created rate_limits table');
    
    // 8. Create tree_events table
    await client.query(`
      CREATE TABLE tree_events (
        id bigserial PRIMARY KEY,
        tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
        kind text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX tree_events_tree_id ON tree_events (tree_id, id)`);
    await client.query(`CREATE INDEX tree_events_gc ON tree_events (created_at)`);
    console.log('Created tree_events table');
    
    // 9. Create source_verifications table
    await client.query(`
      CREATE TABLE source_verifications (
        url_hash text PRIMARY KEY,
        ok boolean NOT NULL,
        checked_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    console.log('Created source_verifications table');
    
    // 10. Insert global tree
    await client.query(`
      INSERT INTO trees (slug, name, tagline, is_global, access_mode, theme)
      VALUES ('global', 'The Wishing Tree', 'Every leaf is a wish.', true, 'open',
        '{"sky":"dusk","canopy":"ember","leafPalette":["#ffd166","#ef476f","#f78c6b","#ffe08a","#f4a261"],"leafShape":"oval"}'::jsonb)
    `);
    console.log('Inserted global tree');
    
    await client.query('COMMIT');
    console.log('Schema setup complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error setting up schema:', err);
  } finally {
    client.release();
  }
}

setupSchema();