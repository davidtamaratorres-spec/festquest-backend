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
    console.log("⚠️ Iniciando reconstrucción...");

    const before = await pool.query("SELECT COUNT(*) FROM municipalities");
    console.log("Antes:", before.rows[0].count);

    // 1. BORRAR PRIMERO FESTIVALS
    await pool.query("DELETE FROM festivals");
    console.log("Festivals eliminados");

    // 2. BORRAR MUNICIPALITIES
    await pool.query("DELETE FROM municipalities");
    console.log("Municipalities eliminados");

    const rows = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {

        let inserted = 0;

        for (const row of rows) {
          const codigo = String(parseInt(row.Codigo_id));
          const nombre = row.municipio;
          const departamento = row.departamento;

          if (!codigo || codigo === "NaN" || !nombre) continue;

          await pool.query(
            `
            INSERT INTO municipalities (nombre, departamento, codigo_dane)
            VALUES ($1, $2, $3)
            `,
            [nombre, departamento, codigo]
          );

          inserted++;
        }

        console.log("Insertados:", inserted);

        const after = await pool.query("SELECT COUNT(*) FROM municipalities");
        console.log("Después:", after.rows[0].count);

        await pool.end();
      });

  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

run();