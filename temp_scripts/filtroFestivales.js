require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const { rows: total } = await pool.query(
    'SELECT COUNT(DISTINCT m.id)::int AS n FROM municipalities m JOIN festivals f ON f.municipio_id = m.id'
  );

  const { rows } = await pool.query(`
    SELECT m.id, m.nombre, m.departamento,
           COUNT(f.id)::int                                                               AS total_fest,
           COUNT(f.id) FILTER (WHERE f.descripcion    IS NULL OR TRIM(f.descripcion)='') ::int AS sin_desc,
           COUNT(f.id) FILTER (WHERE f.lugar_encuentro IS NULL OR TRIM(f.lugar_encuentro)='')::int AS sin_lugar
    FROM municipalities m
    JOIN festivals f ON f.municipio_id = m.id
    GROUP BY m.id, m.nombre, m.departamento
    ORDER BY m.nombre ASC
  `);

  const validos     = rows.filter(r => r.sin_desc === 0 && r.sin_lugar === 0);
  const descartados = rows.filter(r => r.sin_desc > 0 || r.sin_lugar > 0);

  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  const line = '─'.repeat(72);

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log('  FILTRO: municipios con festivales completos (desc + lugar_encuentro)');
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log('  Total municipios con festivales : ' + total[0].n);
  console.log('  Válidos (todos los festivales completos) : ' + validos.length);
  console.log('  Descartados (algún festival incompleto)  : ' + descartados.length);

  if (descartados.length) {
    console.log('\n  DESCARTADOS — municipios con festival sin descripción o lugar_encuentro:');
    console.log('  ' + line);
    console.log('  ' + pad('MUNICIPIO', 26) + pad('DEPARTAMENTO', 22) + 'FEST  SIN_DESC  SIN_LUGAR');
    console.log('  ' + line);
    for (const r of descartados) {
      console.log(
        '  ' + pad(r.nombre, 26) + pad(r.departamento || '', 22) +
        String(r.total_fest).padEnd(6) + String(r.sin_desc).padEnd(10) + r.sin_lugar
      );
    }
  }

  if (validos.length) {
    console.log('\n  VÁLIDOS — municipios donde todos los festivales tienen desc + lugar:');
    console.log('  ' + line);
    console.log('  ' + pad('MUNICIPIO', 26) + pad('DEPARTAMENTO', 22) + 'FESTIVALES');
    console.log('  ' + line);
    for (const r of validos) {
      console.log('  ' + pad(r.nombre, 26) + pad(r.departamento || '', 22) + r.total_fest);
    }
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════════════');
  await pool.end();
}

main().catch(e => { console.error('❌ ' + e.message); pool.end(); process.exit(1); });
