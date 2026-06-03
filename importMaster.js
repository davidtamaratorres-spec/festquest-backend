require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CSV_MUNICIPIOS = path.join(__dirname, 'data', 'municipios_master_enriquecido.csv');
const CSV_FESTIVALES = path.join(__dirname, 'data', 'festivales_maestro_2026.csv');

// ─── Helpers ────────────────────────────────────────────────────────────────

function limpio(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toInt(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function toFloat(v) {
  const s = String(v || '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Normaliza código DANE eliminando ceros a la izquierda para coincidir con los
// registros existentes que fueron cargados originalmente como INTEGER.
function normDane(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : String(n);
}

// ─── Municipios (UPSERT) ─────────────────────────────────────────────────────

async function importarMunicipios(client) {
  console.log('\n╔══════════════════════════════╗');
  console.log('║       MUNICIPIOS (UPSERT)    ║');
  console.log('╚══════════════════════════════╝');

  const raw = fs.readFileSync(CSV_MUNICIPIOS, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`📄 Filas leídas del CSV : ${rows.length}`);

  let insertados = 0;
  let actualizados = 0;
  let omitidos = 0;
  let errores = 0;

  for (const row of rows) {
    const dane = normDane(row.codigo_dane);
    const nombre = limpio(row.municipio);

    if (!dane || !nombre) {
      omitidos++;
      continue;
    }

    try {
      const res = await client.query(
        `INSERT INTO municipalities
           (nombre, municipio, departamento, codigo_dane, subregion,
            habitantes, temperatura_promedio, altura, gentilicio,
            alcalde, bandera_url, sitios_turisticos, hoteles, contacto_hoteles)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (codigo_dane) DO UPDATE SET
           nombre              = EXCLUDED.nombre,
           municipio           = EXCLUDED.municipio,
           departamento        = EXCLUDED.departamento,
           subregion           = EXCLUDED.subregion,
           habitantes          = EXCLUDED.habitantes,
           temperatura_promedio = EXCLUDED.temperatura_promedio,
           altura              = EXCLUDED.altura,
           gentilicio          = EXCLUDED.gentilicio,
           alcalde             = EXCLUDED.alcalde,
           bandera_url         = EXCLUDED.bandera_url,
           sitios_turisticos   = EXCLUDED.sitios_turisticos,
           hoteles             = EXCLUDED.hoteles,
           contacto_hoteles    = EXCLUDED.contacto_hoteles
         RETURNING id, (xmax = 0) AS fue_insertado`,
        [
          nombre,
          nombre,
          limpio(row.departamento),
          dane,
          limpio(row.subregion),
          toInt(row.poblacion),
          toFloat(row.temperatura_promedio),
          toInt(row.altitud_ms_nm),
          limpio(row.gentilicio),
          limpio(row.alcalde_actual),
          limpio(row.bandera_url),
          limpio(row.sitios_turisticos),
          limpio(row.hoteles),
          limpio(row.contacto_hoteles),
        ]
      );

      if (res.rows[0].fue_insertado) insertados++;
      else actualizados++;
    } catch (err) {
      errores++;
      console.error(`  ❌ Error (${nombre} / dane:${dane}): ${err.message}`);
    }
  }

  console.log(`  ✅ Insertados  : ${insertados}`);
  console.log(`  🔄 Actualizados: ${actualizados}`);
  if (omitidos > 0) console.log(`  ⏭️  Omitidos   : ${omitidos} (sin código DANE o nombre)`);
  if (errores > 0)  console.log(`  ❌ Errores     : ${errores}`);

  return { insertados, actualizados, omitidos, errores };
}

// ─── Festivales (TRUNCATE + recarga) ────────────────────────────────────────

async function importarFestivales(client) {
  console.log('\n╔══════════════════════════════════╗');
  console.log('║   FESTIVALES (TRUNCATE + CARGA)  ║');
  console.log('╚══════════════════════════════════╝');

  const raw = fs.readFileSync(CSV_FESTIVALES, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`📄 Filas leídas del CSV : ${rows.length}`);

  // Aviso antes de borrar
  const { rows: preCount } = await client.query(
    `SELECT
       (SELECT COUNT(*) FROM festivals)   AS festivales,
       (SELECT COUNT(*) FROM promotions WHERE festival_id IS NOT NULL) AS promociones`
  );
  console.log(`⚠️  Se eliminarán: ${preCount[0].festivales} festivales y ${preCount[0].promociones} promociones vinculadas`);

  await client.query('TRUNCATE TABLE festivals RESTART IDENTITY CASCADE');
  console.log('🗑️  TRUNCATE completado (festivals + promotions en cascade)');

  let insertados = 0;
  let sinMunicipio = 0;
  let errores = 0;

  for (const row of rows) {
    const nombreFest = limpio(row.festival);
    if (!nombreFest) continue;

    const dane = normDane(row.codigo_dane);
    let municipioId = null;

    if (dane) {
      const mRes = await client.query(
        'SELECT id FROM municipalities WHERE codigo_dane = $1 LIMIT 1',
        [dane]
      );
      if (mRes.rows.length > 0) {
        municipioId = mRes.rows[0].id;
      } else {
        sinMunicipio++;
      }
    }

    const year = row.fecha_inicio ? toInt(row.fecha_inicio.substring(0, 4)) : null;

    try {
      await client.query(
        `INSERT INTO festivals
           (nombre, festival, fecha_inicio, fecha_fin, year,
            municipio_id, codigo_dane, departamento, municipio,
            source_type, verified, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'base',false,true)`,
        [
          nombreFest,
          nombreFest,
          limpio(row.fecha_inicio) || null,
          limpio(row.fecha_fin)    || null,
          year,
          municipioId,
          dane,
          limpio(row.departamento),
          limpio(row.municipio),
        ]
      );
      insertados++;
    } catch (err) {
      errores++;
      console.error(`  ❌ Error ("${nombreFest}"): ${err.message}`);
    }
  }

  console.log(`  ✅ Insertados      : ${insertados}`);
  if (sinMunicipio > 0) console.log(`  ⚠️  Sin municipio_id: ${sinMunicipio} (código DANE no encontrado en municipalities)`);
  if (errores > 0)      console.log(`  ❌ Errores          : ${errores}`);

  return { insertados, sinMunicipio, errores };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando importación desde archivos maestros...');
  console.log(`   Municipios : ${CSV_MUNICIPIOS}`);
  console.log(`   Festivales : ${CSV_FESTIVALES}`);

  const client = await pool.connect();
  try {
    const resMun  = await importarMunicipios(client);
    const resFest = await importarFestivales(client);

    console.log('\n╔══════════════════════════════╗');
    console.log('║       RESUMEN FINAL          ║');
    console.log('╚══════════════════════════════╝');
    console.log(`Municipios → ${resMun.insertados} insertados, ${resMun.actualizados} actualizados, ${resMun.errores} errores`);
    console.log(`Festivales → ${resFest.insertados} insertados, ${resFest.sinMunicipio} sin municipio_id, ${resFest.errores} errores`);
    console.log('\n✅ Importación completada.');
  } catch (err) {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
