const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const OUT_FILE = path.join(__dirname, "../data_std/festivals_list.csv");

async function run() {
  console.log("📤 EXPORTANDO FESTIVALES");

  const result = await pool.query(`
    SELECT DISTINCT
      f.nombre,
      m.nombre AS municipio,
      m.departamento,
      m.codigo_dane
    FROM festivals f
    JOIN municipalities m ON m.id = f.municipio_id
    ORDER BY m.departamento, m.nombre
  `);

  const rows = result.rows;

  const headers = ["nombre", "municipio", "departamento", "codigo_dane"];

  const csv = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => `"${(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUT_FILE, csv);

  console.log("✅ Exportados:", rows.length);
  console.log("📁 Archivo:", OUT_FILE);

  process.exit();
}

run();