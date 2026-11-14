import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  const client = await pool.connect();
  try {
    // Try creating a function with different column name
    await client.query(`
      CREATE OR REPLACE FUNCTION test_func() RETURNS TABLE(id uuid, leaf_pos integer) LANGUAGE plpgsql AS
      $$
      DECLARE
        v_pos integer;
      BEGIN
        SELECT 1 INTO v_pos;
        RETURN QUERY SELECT v_id, v_pos FROM (SELECT 1 as v_id, 1 as leaf_pos) t;
      END
      $$;
    `);
    console.log('Function created successfully');
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

test();