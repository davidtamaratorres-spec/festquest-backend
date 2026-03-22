const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const FILE = path.join(__dirname, "../data_std/municipios_master_std.csv");

function clean(v) {
  if (!v) return "";
  return String(v).trim();
}

function normalize(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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
  console.log("🚀 LLENADO DIRECTO POR MUNICIPIO");

  const rows = await loadCSV(FILE);

  const db = await pool.query(`
    SELECT f.id, m.nombre AS municipio
    FROM festivals f
    JOIN municipalities m ON m.id = f.municipio_id
    ORDER BY f.id
  `);

  const map = new Map();

  for (const r of db.rows) {
    const key = normalize(r.municipio);
    if (!map.has(key)) {
      map.set(key, r.id); // solo el primero
    }
  }

  let updated = 0;

  for (const row of rows) {
    const key = normalize(row.municipio);

    if (!map.has(key)) continue;

    const id = map.get(key);

    await pool.query(
      `
      UPDATE festivals
      SET
        sitio_1 = COALESCE(NULLIF($2, ''), sitio_1),
        maps_1  = COALESCE(NULLIF($3, ''), maps_1),
        sitio_2 = COALESCE(NULLIF($4, ''), sitio_2),
        maps_2  = COALESCE(NULLIF($5, ''), maps_2),
        sitio_3 = COALESCE(NULLIF($6, ''), sitio_3),
        maps_3  = COALESCE(NULLIF($7, ''), maps_3),
        hotel_1 = COALESCE(NULLIF($8, ''), hotel_1),
        wa_1    = COALESCE(NULLIF($9, ''), wa_1),
        hotel_2 = COALESCE(NULLIF($10, ''), hotel_2),
        wa_2    = COALESCE(NULLIF($11, ''), wa_2),
        hotel_3 = COALESCE(NULLIF($12, ''), hotel_3),
        wa_3    = COALESCE(NULLIF($13, ''), wa_3)
      WHERE id = $1
      `,
      [
        id,
        clean(row.sitio_1),
        clean(row.maps_1),
        clean(row.sitio_2),
        clean(row.maps_2),
        clean(row.sitio_3),
        clean(row.maps_3),
        clean(row.hotel_1),
        clean(row.wa_1),
        clean(row.hotel_2),
        clean(row.wa_2),
        clean(row.hotel_3),
        clean(row.wa_3),
      ]
    );

    updated++;
  }

  console.log("✅ Actualizados:", updated);
  process.exit();
}

run();