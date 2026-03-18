const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const csvFilePath = path.join(__dirname, "data", "municipios_de_colombia.csv");

async function run() {
  try {
    if (!fs.existsSync(csvFilePath)) {
      console.error("❌ No se encontró el archivo:", csvFilePath);
      process.exit(1);
    }

    const rows = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", async () => {
        const missing = [];

        for (const row of rows) {
          const rawCodigo = row.Codigo_id;

          if (!rawCodigo) continue;

          const codigo = String(parseInt(rawCodigo, 10));

          if (!codigo || codigo === "NaN") continue;

          const result = await pool.query(
            `SELECT 1 FROM municipalities WHERE codigo_dane = $1 LIMIT 1`,
            [codigo]
          );

          if (result.rowCount === 0) {
            missing.push({
              codigo,
              nombre: row.municipio || null,
              departamento: row.departamento || null,
            });
          }
        }

        console.log("Municipios faltantes:", missing.length);
        console.log("Ejemplos:", missing.slice(0, 10));

        await pool.end();
      })
      .on("error", async (error) => {
        console.error("❌ Error leyendo CSV:", error.message);
        await pool.end();
        process.exit(1);
      });
  } catch (error) {
    console.error("❌ Error general:", error.message);
    await pool.end();
    process.exit(1);
  }
}

run();