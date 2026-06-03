const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const csvFilePath = path.join(__dirname, "data", "datos_nacionales.csv");

async function run() {
  try {
    console.log("Cargando lugares...");

    const rows = [];

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        let municipiosEncontrados = 0;
        let inserted = 0;

        for (const row of rows) {
          const codigo = String(parseInt(row.Codigo_id, 10));
          if (!codigo || codigo === "NaN") continue;

          const municipioResult = await pool.query(
            `SELECT id FROM municipalities WHERE codigo_dane = $1 LIMIT 1`,
            [codigo]
          );

          if (municipioResult.rowCount === 0) continue;

          municipiosEncontrados++;

          const municipio_id = municipioResult.rows[0].id;

          const sitios = [
            { nombre: row.sitio_1, maps: row.maps_1 },
            { nombre: row.sitio_2, maps: row.maps_2 },
            { nombre: row.sitio_3, maps: row.maps_3 },
          ];

          for (const sitio of sitios) {
            if (sitio.nombre && sitio.nombre.trim() !== "") {
              await pool.query(
                `
                INSERT INTO places (nombre, maps_link, municipio_id)
                VALUES ($1, $2, $3)
                `,
                [
                  sitio.nombre.trim(),
                  sitio.maps ? sitio.maps.trim() : null,
                  municipio_id,
                ]
              );

              inserted++;
            }
          }
        }

        console.log("Municipios encontrados:", municipiosEncontrados);
        console.log("Lugares insertados:", inserted);

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