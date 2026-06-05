require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const CAMPOS = [
  'habitantes', 'temperatura_promedio', 'altura',
  'alcalde', 'correo_alcalde',
  'bandera_url', 'gentilicio', 'codigo_dane',
  'sitio_1', 'sitio_2', 'sitio_3',
  'maps_1', 'maps_2', 'maps_3',
  'hotel_1', 'hotel_2', 'hotel_3',
  'wa_1', 'wa_2', 'wa_3',
  'latitud', 'longitud',
]; // 22 campos

const TOTAL = CAMPOS.length; // 22

function presente(v) {
  if (v === null || v === undefined) return false;
  return String(v).trim().length > 0;
}

async function main() {
  const { rows } = await pool.query(`
    SELECT
      id, nombre, departamento, subregion,
      habitantes, temperatura_promedio, altura,
      alcalde, correo_alcalde,
      bandera_url, gentilicio, codigo_dane,
      sitio_1, sitio_2, sitio_3,
      maps_1, maps_2, maps_3,
      hotel_1, hotel_2, hotel_3,
      wa_1, wa_2, wa_3,
      latitud, longitud
    FROM municipalities
    ORDER BY nombre ASC
  `);

  console.log(`\n📊 Diagnóstico de municipios — ${rows.length} registros\n`);

  const resultados = rows.map(r => {
    const vacios = CAMPOS.filter(c => !presente(r[c]));
    const completos = TOTAL - vacios.length;
    const pct = Math.round((completos / TOTAL) * 100);
    return { id: r.id, nombre: r.nombre, departamento: r.departamento ?? '', vacios, pct };
  });

  // Ordenar de menos a más completo
  resultados.sort((a, b) => a.pct - b.pct);

  // ── Tabla ──────────────────────────────────────────────────────────────────
  const COL_MUN  = 28;
  const COL_DEPT = 22;
  const COL_PCT  = 6;
  const COL_VACIOS = 40;

  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  const line = `${'─'.repeat(COL_MUN)} ${'─'.repeat(COL_DEPT)} ${'─'.repeat(COL_PCT)} ${'─'.repeat(COL_VACIOS)}`;

  console.log(
    `${pad('MUNICIPIO', COL_MUN)} ${pad('DEPARTAMENTO', COL_DEPT)} ${pad('%', COL_PCT)} CAMPOS VACÍOS`
  );
  console.log(line);

  for (const r of resultados) {
    const pctStr = `${r.pct}%`;
    const vaciosStr = r.vacios.length === 0 ? '✓ completo' : r.vacios.join(', ');
    console.log(
      `${pad(r.nombre, COL_MUN)} ${pad(r.departamento, COL_DEPT)} ${pad(pctStr, COL_PCT)} ${vaciosStr}`
    );
  }

  // ── Resumen por campo ──────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(80)}`);
  console.log('RESUMEN POR CAMPO — vacíos sobre total\n');

  const campoStats = CAMPOS.map(c => {
    const vacios = rows.filter(r => !presente(r[c])).length;
    const pct = Math.round((vacios / rows.length) * 100);
    return { campo: c, vacios, pct };
  }).sort((a, b) => b.vacios - a.vacios);

  for (const { campo, vacios, pct } of campoStats) {
    const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20);
    console.log(`  ${campo.padEnd(22)} ${bar} ${vacios}/${rows.length} (${pct}% vacíos)`);
  }

  // ── Cuántos tienen fecha en festivales ────────────────────────────────────
  const { rows: sinNada } = await pool.query(`
    SELECT COUNT(*)::int AS n FROM municipalities
    WHERE habitantes IS NULL AND codigo_dane IS NULL AND gentilicio IS NULL
  `);
  const { rows: total } = await pool.query(`SELECT COUNT(*)::int AS n FROM municipalities`);

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`Total municipios: ${total[0].n}`);
  console.log(`Sin datos básicos (hab + dane + gentilicio): ${sinNada[0].n}`);
  console.log(`Promedio de completitud: ${Math.round(resultados.reduce((s, r) => s + r.pct, 0) / resultados.length)}%\n`);

  await pool.end();
}

main().catch(e => { console.error('❌', e.message); pool.end(); process.exit(1); });
