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
    console.log("Cargando festivales...");

    const rows = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        console.log("Filas leídas:", rows.length);
        console.log("Columnas detectadas:", Object.keys(rows[0] || {}));

        let withFestival = 0;
        let municipioFound = 0;
        let inserted = 0;

        for (const row of rows) {
          const codigo = String(parseInt(row.Codigo_id, 10));
          const nombreFestival = row.festival ? String(row.festival).trim() : "";
          const fecha = row.fecha ? String(row.fecha).trim() : "";

          if (!codigo || codigo === "NaN") continue;
          if (!nombreFestival) continue;

          withFestival++;

          const municipioResult = await pool.query(
            `SELECT id FROM municipalities WHERE codigo_dane = $1 LIMIT 1`,
            [codigo]
          );

          if (municipioResult.rowCount === 0) {
            continue;
          }

          municipioFound++;

          await pool.query(
            `
            INSERT INTO festivals (nombre, fecha, municipio_id)
            VALUES ($1, $2, $3)
            `,
            [nombreFestival, fecha || null, municipioResult.rows[0].id]
          );

          inserted++;
        }

        console.log("Filas con festival:", withFestival);
        console.log("Municipios encontrados:", municipioFound);
        console.log("Festivales insertados:", inserted);

        await pool.end();
      })
      .on("error", async (error) => {
        console.error("Error leyendo CSV:", error.message);
        await pool.end();
      });
  } catch (error) {
    console.error("Error general:", error.message);
    await pool.end();
  }
}

run();