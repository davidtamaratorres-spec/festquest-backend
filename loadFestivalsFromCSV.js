const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const csvFilePath = path.join(__dirname, "data", "festivals_master.csv");

function limpiar(valor) {
  if (valor === undefined || valor === null) return "";
  return String(valor).replace(/"/g, "").trim();
}

function limpiarCodigo(valor) {
  const limpio = limpiar(valor);
  if (!limpio) return "";
  return limpio.replace(/^0+/, "");
}

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

        let conCodigo = 0;
        let municipioFound = 0;
        let inserted = 0;
        let sinMatch = 0;

        await pool.query("TRUNCATE TABLE festivals CASCADE;");
        console.log("Tabla festivals vaciada");

        for (const row of rows) {
          const codigo = limpiarCodigo(row.municipio_codigo_dane);
          const nombreFestival = limpiar(row.nombre);
          const fechaInicio = limpiar(row.date_start);
          const descripcion = limpiar(row.descripcion) || "Base inicial";

          if (!codigo) continue;
          if (!nombreFestival) continue;

          conCodigo++;

          const municipioResult = await pool.query(
            `SELECT id FROM municipalities WHERE codigo_dane::text = $1 LIMIT 1`,
            [codigo]
          );

          if (municipioResult.rowCount === 0) {
            sinMatch++;
            continue;
          }

          municipioFound++;

          await pool.query(
            `
            INSERT INTO festivals (nombre, fecha, descripcion, municipio_id)
            VALUES ($1, $2, $3, $4)
            `,
            [
              nombreFestival,
              fechaInicio || null,
              descripcion,
              municipioResult.rows[0].id,
            ]
          );

          inserted++;

          if (inserted % 100 === 0) {
            console.log("Festivales insertados:", inserted);
          }
        }

        console.log("Filas con código y nombre:", conCodigo);
        console.log("Municipios encontrados:", municipioFound);
        console.log("Festivales insertados:", inserted);
        console.log("Sin match municipio:", sinMatch);

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