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

// Quita separadores de miles (punto) y convierte a entero
function toInt(v) {
  if (!v || String(v).trim() === '') return null;
  const clean = String(v).replace(/\./g, '').replace(/,/g, '').trim();
  const n = parseInt(clean, 10);
  return isNaN(n) ? null : n;
}

function toFloat(v) {
  if (!v || String(v).trim() === '') return null;
  const s = String(v).replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function main() {
  const raw  = fs.readFileSync(path.join(__dirname, 'data', 'datos_nacionales.csv'), 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`📄 Filas en datos_nacionales.csv: ${rows.length}`);

  const client = await pool.connect();
  let updated = 0;
  let noMatch = 0;

  for (const row of rows) {
    const dane = normDane(row.Codigo_id);
    if (!dane) continue;

    const subregion    = row.Subregion     ? row.Subregion.trim()  : null;
    const habitantes   = toInt(row.habitantes);
    const temperatura  = toFloat(row.temperatura_promedio);
    const altura       = toInt(row.altura);

    const res = await client.query(
      `UPDATE municipalities
         SET subregion = $1, habitantes = $2,
             temperatura_promedio = $3, altura = $4
       WHERE codigo_dane = $5`,
      [subregion, habitantes, temperatura, altura, dane]
    );

    if (res.rowCount > 0) {
      updated++;
      console.log(`  ✅ ${row.municipio} (${dane}) — subregion: ${subregion}, hab: ${habitantes}, temp: ${temperatura}°C, altura: ${altura}m`);
    } else {
      noMatch++;
      console.log(`  ⚠️  Sin coincidencia: ${row.municipio} (dane: ${dane})`);
    }
  }

  console.log(`\n✅ Actualizados: ${updated}`);
  if (noMatch > 0) console.log(`⚠️  Sin match en BD: ${noMatch}`);

  client.release();
  await pool.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
