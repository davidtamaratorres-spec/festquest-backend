require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const { rows: fc } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='festivals' ORDER BY ordinal_position"
  );
  const { rows: mc } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='municipalities' AND column_name LIKE '%url%' ORDER BY column_name"
  );
  const { rows: stats } = await pool.query(
    "SELECT COUNT(*)::int AS total, COUNT(descripcion)::int AS con_desc, COUNT(municipio_id)::int AS con_muni FROM festivals"
  );
  console.log('festivals columns:', fc.map(r => r.column_name).join(', '));
  console.log('municipalities url columns:', mc.map(r => r.column_name).join(', '));
  console.log('stats:', stats[0]);
  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
