import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debug() {
  const client = await pool.connect();
  try {
    // Check if function exists
    const funcResult = await client.query(`SELECT proname, prosrc FROM pg_proc WHERE proname = 'submit_leaf'`);
    console.log('Function exists:', funcResult.rows.length > 0);
    if (funcResult.rows.length > 0) {
      console.log('Function source exists');
    }
    
    // Check table columns
    const columnsResult = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leaves' ORDER BY ordinal_position`);
    console.log('Leaves columns:', columnsResult.rows.map(r => r.column_name + ' (' + r.data_type + ')'));
    
    // Check enum
    const enumResult = await client.query(`SELECT enum_range(NULL::leaf_status)`);
    console.log('leaf_status enum values:', enumResult.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
  }
}

debug();