require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function construirDescripcion(nombre, municipio, departamento) {
  if (!nombre || !municipio || !departamento) return null;
  return `Las ${nombre} se celebran en ${municipio}, ${departamento}. Es una de las festividades tradicionales del municipio.`;
}

async function main() {
  const client = await pool.connect();

  const { rows: festivales } = await client.query(`
    SELECT id, nombre, municipio, departamento
    FROM festivals
    WHERE (descripcion IS NULL OR TRIM(descripcion) = '' OR descripcion LIKE 'Las % se celebran%')
      AND is_active = true
    ORDER BY id ASC
  `);

  console.log(`\n📋 Festivales sin descripción: ${festivales.length}`);

  let actualizados = 0;
  let sinDatos     = 0;

  for (const f of festivales) {
    const desc = construirDescripcion(f.nombre, f.municipio, f.departamento);

    if (!desc) { sinDatos++; continue; }

    await client.query(
      'UPDATE festivals SET descripcion = $1 WHERE id = $2',
      [desc, f.id]
    );
    actualizados++;
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           RESUMEN FINAL              ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  ✅ Actualizados con descripción básica : ${actualizados}`);
  console.log(`  ⚪ Sin datos suficientes (omitidos)    : ${sinDatos}`);

  // Muestra 3 ejemplos de cómo quedaron
  const { rows: ejemplos } = await client.query(`
    SELECT nombre, municipio, descripcion
    FROM festivals
    WHERE descripcion LIKE 'Las % se celebran%'
    ORDER BY id LIMIT 3
  `);
  console.log('\n── Ejemplos ───────────────────────────────────────────────────');
  ejemplos.forEach(e => {
    console.log(`\n  "${e.nombre}" (${e.municipio})`);
    console.log(`  → ${e.descripcion}`);
  });

  client.release();
  await pool.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
