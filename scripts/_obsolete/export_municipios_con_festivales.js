const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const OUT_FILE = path.join(__dirname, "../data_std/municipios_con_festivales.csv");

async function run() {
  const result = await pool.query(`
    SELECT DISTINCT
      m.codigo_dane,
      m.nombre AS municipio,
      m.departamento
    FROM festivals f
    JOIN municipalities m ON m.id = f.municipio_id
    ORDER BY m.departamento, m.nombre
  `);

  const rows = result.rows;
  const headers = ["codigo_dane", "municipio", "departamento"];

  const csv = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => `"${String(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUT_FILE, csv, "utf8");

  console.log("✅ Municipios exportados:", rows.length);
  console.log("📁 Archivo:", OUT_FILE);

  await pool.end();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("❌ Error:", err.message);
  await pool.end();
  process.exit(1);
});