const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const FILE = path.join(__dirname, "../data_std/festivals_std.csv");

function loadCSV(filePath) {
  return new Promise((resolve) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}

async function run() {
  console.log("🚀 CARGA FINAL DESDE STD");

  const data = await loadCSV(FILE);

  const municipios = await pool.query(`
    SELECT id, codigo_dane FROM municipalities
  `);

  const map = new Map();
  municipios.rows.forEach(m => {
    map.set(String(m.codigo_dane), m.id);
  });

  console.log("🧹 Limpiando festivals...");
  await pool.query("DELETE FROM festivals");

  let inserted = 0;

  for (const r of data) {
    const municipio_id = map.get(r.codigo_dane);

    if (!municipio_id) continue;

    await pool.query(
      `
      INSERT INTO festivals (
        nombre,
        fecha,
        descripcion,
        municipio_id,
        date_start,
        date_end,
        year,
        sitio_1, maps_1,
        sitio_2, maps_2,
        sitio_3, maps_3,
        hotel_1, wa_1,
        hotel_2, wa_2,
        hotel_3, wa_3,
        source_type,
        verified,
        is_active
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,
        $10,$11,
        $12,$13,
        $14,$15,
        $16,$17,
        $18,$19,
        $20,$21,true
      )
      `,
      [
        r.nombre_festival,
        r.date_start || null,
        r.descripcion,
        municipio_id,
        r.date_start || null,
        r.date_end || null,
        r.year || 2026,
        r.sitio_1, r.maps_1,
        r.sitio_2, r.maps_2,
        r.sitio_3, r.maps_3,
        r.hotel_1, r.wa_1,
        r.hotel_2, r.wa_2,
        r.hotel_3, r.wa_3,
        r.source_type,
        r.verified === "true",
      ]
    );

    inserted++;
  }

  console.log("✅ Festivales cargados:", inserted);
  process.exit();
}

run();