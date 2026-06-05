require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pool }  = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// importMaster almacenó los códigos DANE sin ceros a la izquierda
function normDane(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : String(n);
}

// Devuelve null si el valor está vacío
function val(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toInt(v) {
  const s = val(v);
  if (!s) return null;
  // Un solo punto → decimal (ej. "1475.0") → parseFloat → round
  // Múltiples puntos → separadores de miles (ej. "2.600.000") → strip dots
  const dotCount = (s.match(/\./g) || []).length;
  const n = dotCount === 1
    ? Math.round(parseFloat(s))
    : parseInt(s.replace(/\./g, ''), 10);
  return isNaN(n) ? null : n;
}

function toFloat(v) {
  const s = val(v);
  if (!s) return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Concatena campos no-vacíos con "|"
function pipe(...fields) {
  const parts = fields.map(f => val(f)).filter(Boolean);
  return parts.length > 0 ? parts.join('|') : null;
}

async function main() {
  const csvPath = path.join(__dirname, 'data', 'master_alimentacion.csv');
  const raw  = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  console.log(`\n📄 Filas en master_alimentacion.csv: ${rows.length}`);

  const client = await pool.connect();

  let muniOK = 0, muniSkip = 0;
  let festOK = 0, festSkip = 0;

  for (const row of rows) {
    const dane = normDane(row.codigo_dane);
    if (!dane) continue;

    // ── 1. UPDATE municipalities ────────────────────────────────────
    const mRes = await client.query(
      `UPDATE municipalities SET
         subregion            = COALESCE($1,  subregion),
         habitantes           = COALESCE($2,  habitantes),
         temperatura_promedio = COALESCE($3,  temperatura_promedio),
         altura               = COALESCE($4,  altura),
         gentilicio           = COALESCE($5,  gentilicio),
         alcalde              = COALESCE($6,  alcalde),
         correo_alcalde       = COALESCE($7,  correo_alcalde),
         bandera_url          = COALESCE($8,  bandera_url),
         sitios_turisticos    = COALESCE($9,  sitios_turisticos),
         hoteles              = COALESCE($10, hoteles),
         contacto_hoteles     = COALESCE($11, contacto_hoteles)
       WHERE codigo_dane = $12`,
      [
        val(row.subregion),
        toInt(row.habitantes),
        toFloat(row.temperatura_promedio),
        toInt(row.altura),
        val(row.gentilicio),
        val(row.alcalde),
        val(row.correo_alcalde),
        val(row.bandera_jpg),
        pipe(row.sitio_1, row.sitio_2, row.sitio_3),
        pipe(row.hotel_1, row.hotel_2, row.hotel_3),
        pipe(row.wa_1,    row.wa_2,    row.wa_3),
        dane,
      ]
    );

    if (mRes.rowCount > 0) muniOK++;
    else muniSkip++;

    // ── 2. UPDATE festivals ─────────────────────────────────────────
    const festivalCSV = val(row.festival);

    // Solo actualizar si hay algo que escribir
    const tieneData = row.descripcion_festival || row.sitio_1 || row.hotel_1;
    if (!tieneData) continue;

    // Intento 1: match por codigo_dane + nombre de festival (ILIKE fuzzy)
    let fRes = { rowCount: 0 };
    if (festivalCSV) {
      fRes = await client.query(
        `UPDATE festivals SET
           descripcion = COALESCE($1,  descripcion),
           sitio_1     = COALESCE($2,  sitio_1),
           maps_1      = COALESCE($3,  maps_1),
           sitio_2     = COALESCE($4,  sitio_2),
           maps_2      = COALESCE($5,  maps_2),
           sitio_3     = COALESCE($6,  sitio_3),
           maps_3      = COALESCE($7,  maps_3),
           hotel_1     = COALESCE($8,  hotel_1),
           wa_1        = COALESCE($9,  wa_1),
           hotel_2     = COALESCE($10, hotel_2),
           wa_2        = COALESCE($11, wa_2),
           hotel_3     = COALESCE($12, hotel_3),
           wa_3        = COALESCE($13, wa_3)
         WHERE codigo_dane = $14
           AND (nombre ILIKE $15 OR festival ILIKE $15)`,
        [
          val(row.descripcion_festival),
          val(row.sitio_1), val(row.maps_1),
          val(row.sitio_2), val(row.maps_2),
          val(row.sitio_3), val(row.maps_3),
          val(row.hotel_1), val(row.wa_1),
          val(row.hotel_2), val(row.wa_2),
          val(row.hotel_3), val(row.wa_3),
          dane,
          `%${festivalCSV}%`,
        ]
      );
    }

    // Intento 2: si no hubo match por nombre y solo hay 1 festival
    // para ese municipio, actualizar ese único festival
    if (fRes.rowCount === 0) {
      const { rows: cnt } = await client.query(
        'SELECT id FROM festivals WHERE codigo_dane = $1', [dane]
      );
      if (cnt.length === 1) {
        const f2 = await client.query(
          `UPDATE festivals SET
             descripcion = COALESCE($1,  descripcion),
             sitio_1     = COALESCE($2,  sitio_1),
             maps_1      = COALESCE($3,  maps_1),
             sitio_2     = COALESCE($4,  sitio_2),
             maps_2      = COALESCE($5,  maps_2),
             sitio_3     = COALESCE($6,  sitio_3),
             maps_3      = COALESCE($7,  maps_3),
             hotel_1     = COALESCE($8,  hotel_1),
             wa_1        = COALESCE($9,  wa_1),
             hotel_2     = COALESCE($10, hotel_2),
             wa_2        = COALESCE($11, wa_2),
             hotel_3     = COALESCE($12, hotel_3),
             wa_3        = COALESCE($13, wa_3)
           WHERE id = $14`,
          [
            val(row.descripcion_festival),
            val(row.sitio_1), val(row.maps_1),
            val(row.sitio_2), val(row.maps_2),
            val(row.sitio_3), val(row.maps_3),
            val(row.hotel_1), val(row.wa_1),
            val(row.hotel_2), val(row.wa_2),
            val(row.hotel_3), val(row.wa_3),
            cnt[0].id,
          ]
        );
        fRes.rowCount = f2.rowCount;
      }
    }

    if (fRes.rowCount > 0) festOK += fRes.rowCount;
    else festSkip++;
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           RESUMEN FINAL              ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  municipalities → ✅ ${muniOK} actualizados, ⚠️  ${muniSkip} sin match`);
  console.log(`  festivals      → ✅ ${festOK} actualizados, ⚠️  ${festSkip} sin match`);

  client.release();
  await pool.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
