require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pool }  = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function normDane(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : String(n);
}

function val(v) {
  if (!v) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

async function main() {
  const raw  = fs.readFileSync(path.join(__dirname, 'data', 'master_alimentacion.csv'), 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  const client = await pool.connect();

  let actualizados = 0;
  let sinWa        = 0;
  let sinMatch     = 0;

  for (const row of rows) {
    const waLink = val(row.wa_1);

    if (!waLink) { sinWa++; continue; }

    const dane = normDane(row.codigo_dane);
    if (!dane) continue;

    // Usar el link exactamente como viene del CSV — no inventar nada
    const res = await client.query(
      `UPDATE festivals SET whatsapp_link = $1
       WHERE codigo_dane = $2
         AND (whatsapp_link IS NULL OR whatsapp_link = '')`,
      [waLink, dane]
    );

    if (res.rowCount > 0) {
      actualizados += res.rowCount;
      console.log(`  ✅ ${row.municipio} (${dane}) → ${waLink}  [${res.rowCount} festival(es)]`);
    } else {
      sinMatch++;
    }
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           RESUMEN FINAL              ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  ✅ Festivales actualizados : ${actualizados}`);
  console.log(`  ⚪ Filas CSV sin wa_1      : ${sinWa}`);
  if (sinMatch > 0)
    console.log(`  ⚠️  Sin festival en BD     : ${sinMatch}`);

  client.release();
  await pool.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
