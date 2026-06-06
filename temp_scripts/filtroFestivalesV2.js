require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Cobertura de campos en festivals
  const { rows: campos } = await pool.query(`
    SELECT
      COUNT(*)::int                                                                   AS total,
      COUNT(*) FILTER (WHERE descripcion IS NULL OR TRIM(descripcion)='')::int        AS sin_descripcion,
      COUNT(*) FILTER (WHERE lugar_encuentro IS NULL OR TRIM(lugar_encuentro)='')::int AS sin_lugar,
      COUNT(*) FILTER (WHERE descripcion IS NOT NULL AND TRIM(descripcion)<>'')::int   AS con_descripcion,
      COUNT(*) FILTER (WHERE fecha_inicio IS NULL)::int                                AS sin_fecha_inicio,
      COUNT(*) FILTER (WHERE fecha_fin IS NULL)::int                                   AS sin_fecha_fin
    FROM festivals
  `);

  const c = campos[0];
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log('  COBERTURA DE CAMPOS EN LA TABLA festivals');
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log(`  Total festivales          : ${c.total}`);
  console.log(`  Con descripcion           : ${c.con_descripcion} / ${c.total} (${Math.round(c.con_descripcion/c.total*100)}%)`);
  console.log(`  Sin descripcion           : ${c.sin_descripcion} / ${c.total} (${Math.round(c.sin_descripcion/c.total*100)}%)`);
  console.log(`  Sin lugar_encuentro       : ${c.sin_lugar} / ${c.total} (${Math.round(c.sin_lugar/c.total*100)}%)  ← campo globalmente vacío`);
  console.log(`  Sin fecha_inicio          : ${c.sin_fecha_inicio} / ${c.total}`);
  console.log(`  Sin fecha_fin             : ${c.sin_fecha_fin} / ${c.total}`);

  // Filtro solo por descripcion (lugar_encuentro queda fuera del filtro al ser globalmente null)
  const { rows: por_desc } = await pool.query(`
    SELECT
      COUNT(DISTINCT m.id) FILTER (
        WHERE f.descripcion IS NOT NULL AND TRIM(f.descripcion) <> ''
      )::int AS validos,
      COUNT(DISTINCT m.id) FILTER (
        WHERE f.descripcion IS NULL OR TRIM(f.descripcion) = ''
      )::int AS sin_desc
    FROM municipalities m
    JOIN festivals f ON f.municipio_id = m.id
  `);

  const pd = por_desc[0];
  console.log('\n──────────────────────────────────────────────────────────────────────────');
  console.log('  FILTRO AJUSTADO (solo descripción — lugar_encuentro universalmente null)');
  console.log('──────────────────────────────────────────────────────────────────────────');
  console.log(`  Municipios con AL MENOS UN festival con descripción : ${pd.validos}`);
  console.log(`  Municipios donde TODOS los festivales sin descripción: ${pd.sin_desc}`);

  // Municipios donde algún festival tiene descripcion null
  const { rows: sinDesc } = await pool.query(`
    SELECT m.nombre, m.departamento,
           COUNT(f.id)::int                                                              AS total,
           COUNT(f.id) FILTER (WHERE f.descripcion IS NULL OR TRIM(f.descripcion)='')::int AS sin_desc
    FROM municipalities m
    JOIN festivals f ON f.municipio_id = m.id
    GROUP BY m.id, m.nombre, m.departamento
    HAVING COUNT(f.id) FILTER (WHERE f.descripcion IS NULL OR TRIM(f.descripcion)='') > 0
    ORDER BY sin_desc DESC, m.nombre ASC
  `);

  if (sinDesc.length > 0) {
    const pad = (s, n) => String(s).padEnd(n).slice(0, n);
    console.log(`\n  MUNICIPIOS CON FESTIVAL SIN DESCRIPCIÓN (${sinDesc.length} casos):`);
    console.log('  ' + '─'.repeat(60));
    for (const r of sinDesc) {
      console.log(`  ${pad(r.nombre,28)} ${pad(r.departamento||'',20)} ${r.sin_desc}/${r.total} sin desc`);
    }
  }

  // Municipios con data suficiente para correr el enriquecimiento
  const { rows: paraMunicipios } = await pool.query(`
    SELECT COUNT(DISTINCT municipio_id)::int AS n
    FROM festivals
    WHERE municipio_id IS NOT NULL
  `);
  console.log(`\n  MUNICIPIOS ELEGIBLES para completarMunicipios.js : ${paraMunicipios[0].n}`);
  console.log('  (criterio: tener festival vinculado + campos de enrichment vacíos)');
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  await pool.end();
}

main().catch(e => { console.error('❌ ' + e.message); pool.end(); process.exit(1); });
