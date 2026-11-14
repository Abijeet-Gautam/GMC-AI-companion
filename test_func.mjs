import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  const client = await pool.connect();
  try {
    // Try creating the submit_leaf function
    await client.query(`
      CREATE OR REPLACE FUNCTION submit_leaf(
        p_tree uuid, p_author text, p_body text, p_color text, p_leaf_shape text,
        p_flagged boolean, p_flag_reason text, p_publish boolean
      ) RETURNS TABLE(id uuid, position integer)
      LANGUAGE plpgsql AS
      $$
      DECLARE
        v_pos integer;
        v_id  uuid;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext(p_tree::text));
        IF p_publish THEN
          SELECT coalesce(max(l.position), 0) + 1 INTO v_pos
            FROM leaves l WHERE l.tree_id = p_tree AND l.status = 'published';
          INSERT INTO leaves (tree_id, author_id, body, status, position, color, leaf_shape, flagged, flag_reason)
          VALUES (p_tree, p_author, p_body, 'published', v_pos, p_color, p_leaf_shape, p_flagged, p_flag_reason)
          RETURNING leaves.id INTO v_id;
          RETURN QUERY SELECT v_id, v_pos;
        ELSE
          INSERT INTO leaves (tree_id, author_id, body, status, position, color, leaf_shape, flagged, flag_reason, hide_reason)
          VALUES (p_tree, p_author, p_body, 'hidden', 0, p_color, p_leaf_shape, p_flagged, p_flag_reason, 'ai_review')
          RETURNING leaves.id INTO v_id;
          RETURN QUERY SELECT v_id, 0;
        END IF;
      END
      $$;
    `);
    console.log('Function created successfully');
    
    // Test inserting a leaf
    const result = await client.query(
      `SELECT * FROM submit_leaf(gen_random_uuid(), 'anonymous', 'I wish for world peace', '#ff0000', 'oval', false, '', true)`
    );
    console.log('Insert result:', result.rows);
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

test();