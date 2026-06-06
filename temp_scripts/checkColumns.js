require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const { rows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'municipalities'
    ORDER BY ordinal_position
  `);
  console.log('\nColumnas en municipalities:');
  rows.forEach(r => console.log('  ' + r.column_name.padEnd(28) + r.data_type));
  const newCols = ['mandatario_local','mandatario','correo','latitud','longitud','contacto_hoteles'];
  console.log('\nColumnas requeridas por el nuevo formulario:');
  newCols.forEach(c => {
    const exists = rows.some(r => r.column_name === c);
    console.log('  ' + (exists ? '✅' : '❌') + ' ' + c);
  });
  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
