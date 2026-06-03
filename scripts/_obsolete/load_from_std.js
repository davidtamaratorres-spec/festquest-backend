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

function cleanNumber(val) {
  if (!val) return null;
  const num = parseFloat(String(val).replace(",", "."));
  if (isNaN(num)) return null;
  return Math.round(num);
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
  console.log("🚀 CARGA FINAL DESDE STD");

  const data = await loadCSV(FILE);

  console.log("📊 Filas:", data.length);

  if (data.length !== 1119 && data.length !== 1120) {
    console.error("❌ ERROR cantidad:", data.length);
    process.exit(1);
  }

  console.log("🧹 Limpiando...");
  await pool.query("DELETE FROM festivals");
  await pool.query("DELETE FROM municipalities");

  console.log("📦 Insertando...");

  for (const r of data) {
    await pool.query(
      `
      INSERT INTO municipalities
      (nombre, departamento, codigo_dane, subregion, habitantes, temperatura_promedio, altura, bandera_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        r.municipio,
        r.departamento,
        r.codigo_dane,
        r.subregion || null,
        cleanNumber(r.habitantes),
        cleanNumber(r.temperatura_promedio),
        cleanNumber(r.altura),
        r.bandera_url || null,
      ]
    );
  }

  console.log("✅ CARGA FINAL COMPLETA");
  process.exit(0);
}

run();