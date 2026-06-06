require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE latitud IS NOT NULL AND longitud IS NOT NULL)::int AS con_coords,
      COUNT(*) FILTER (WHERE latitud IS NULL)::int                             AS sin_coords,
      COUNT(*) FILTER (WHERE alcalde IS NOT NULL)::int                        AS con_alcalde,
      COUNT(*) FILTER (WHERE gentilicio IS NOT NULL)::int                     AS con_gentilicio,
      COUNT(*) FILTER (WHERE habitantes IS NOT NULL)::int                     AS con_hab,
      COUNT(*)::int                                                           AS total
    FROM municipalities
    WHERE id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
  `);
  const r = rows[0];
  console.log('\nVERIFICACIÓN BD — municipios con festivales');
  console.log('─────────────────────────────────────────');
  console.log(`Total municipios : ${r.total}`);
  console.log(`Con latitud/lon  : ${r.con_coords}/${r.total}  (${Math.round(r.con_coords/r.total*100)}%)`);
  console.log(`Sin coordenadas  : ${r.sin_coords}`);
  console.log(`Con alcalde      : ${r.con_alcalde}/${r.total}`);
  console.log(`Con gentilicio   : ${r.con_gentilicio}/${r.total}`);
  console.log(`Con habitantes   : ${r.con_hab}/${r.total}`);

  // Muestra 5 ejemplos con coords
  const { rows: examples } = await pool.query(`
    SELECT nombre, departamento, round(latitud::numeric,4) AS lat, round(longitud::numeric,4) AS lon
    FROM municipalities
    WHERE latitud IS NOT NULL
      AND id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
    ORDER BY nombre LIMIT 5
  `);
  console.log('\nEjemplos de coordenadas escritas:');
  examples.forEach(e => console.log(`  ${e.nombre.padEnd(26)} ${e.departamento.padEnd(20)} ${e.lat}, ${e.lon}`));
  await pool.end();
}
main().catch(e => { console.error('❌', e.message); pool.end(); });
