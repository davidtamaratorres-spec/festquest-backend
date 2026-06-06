/**
 * migrarColumnas.js
 * Agrega columnas nuevas de forma segura (IF NOT EXISTS).
 *
 * node migrarColumnas.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const migrations = [
    // foto_url ya existe, foto_prompt es nueva
    `ALTER TABLE festivals       ADD COLUMN IF NOT EXISTS foto_prompt TEXT`,
    // escudo_url ya existe — dejamos constancia
    `ALTER TABLE municipalities  ADD COLUMN IF NOT EXISTS escudo_url  TEXT`,
  ];

  console.log('\n🔧 migrarColumnas.js\n');
  for (const sql of migrations) {
    try {
      await pool.query(sql);
      console.log('  ✅', sql.slice(0, 80));
    } catch (e) {
      console.log('  ❌', sql.slice(0, 80), '→', e.message);
    }
  }

  // Verificar columnas resultantes
  const { rows } = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE (table_name = 'festivals'      AND column_name IN ('foto_url', 'foto_prompt'))
       OR (table_name = 'municipalities' AND column_name IN ('bandera_url', 'escudo_url'))
    ORDER BY table_name, column_name
  `);
  console.log('\n  Columnas verificadas:');
  rows.forEach(r => console.log(`    ${r.table_name}.${r.column_name}`));
  console.log('');

  await pool.end();
}

main().catch(e => { console.error('❌ Fatal:', e.message); pool.end(); process.exit(1); });
