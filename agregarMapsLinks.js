require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function buildMapsLink(nombre, municipio, departamento) {
  const parts = [nombre, municipio, departamento].filter(Boolean);
  if (parts.length === 0) return null;
  const query = encodeURIComponent(parts.join(' ')).replace(/%20/g, '+');
  return `https://www.google.com/maps/search/${query}`;
}

async function main() {
  const client = await pool.connect();

  const { rows } = await client.query(`
    SELECT id, nombre, municipio, departamento
    FROM festivals
    WHERE is_active = true
      AND nombre IS NOT NULL
  `);

  console.log(`\n📍 Festivales sin maps_link: ${rows.length}`);

  let actualizados = 0;
  let sinDatos     = 0;

  for (const f of rows) {
    const link = buildMapsLink(f.nombre, f.municipio, f.departamento);
    if (!link) { sinDatos++; continue; }

    await client.query(
      'UPDATE festivals SET maps_link = $1 WHERE id = $2',
      [link, f.id]
    );
    actualizados++;
  }

  // Muestra 3 ejemplos
  const { rows: ejemplos } = await client.query(`
    SELECT nombre, municipio, maps_link
    FROM festivals
    WHERE maps_link LIKE 'https://www.google.com/maps/search/%'
    ORDER BY id LIMIT 3
  `);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           RESUMEN FINAL              ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  ✅ maps_link generados : ${actualizados}`);
  if (sinDatos > 0)
    console.log(`  ⚪ Sin datos (omitidos): ${sinDatos}`);

  console.log('\n── Ejemplos ──────────────────────────────────────────────────');
  ejemplos.forEach(e => {
    console.log(`\n  "${e.nombre}" (${e.municipio})`);
    console.log(`  → ${e.maps_link}`);
  });

  client.release();
  await pool.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
