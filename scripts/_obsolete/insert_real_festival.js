const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const csvFilePath = path.join(__dirname, "..", "data", "festivales_reales.csv");

function clean(value) {
  return String(value || "").trim();
}

async function upsertFestival(row) {
  const municipioNombre = clean(row.municipio);
  const nombre = clean(row.nombre);
  const fecha = clean(row.fecha);
  const descripcion = clean(row.descripcion);

  if (!municipioNombre || !nombre) {
    console.log("Fila omitida por datos incompletos:", row);
    return { status: "skipped" };
  }

  const m = await pool.query(
    `SELECT id FROM municipalities WHERE LOWER(nombre) = LOWER($1) LIMIT 1;`,
    [municipioNombre]
  );

  if (m.rowCount === 0) {
    console.log("Municipio no encontrado:", municipioNombre);
    return { status: "municipio_no_encontrado" };
  }

  const municipio_id = m.rows[0].id;

  const existing = await pool.query(
    `
    SELECT id
    FROM festivals
    WHERE LOWER(nombre) = LOWER($1)
      AND municipio_id = $2
    LIMIT 1;
    `,
    [nombre, municipio_id]
  );

  if (existing.rowCount > 0) {
    await pool.query(
      `
      UPDATE festivals
      SET source_type = 'real',
          verified = true,
          is_active = true,
          fecha = $2,
          descripcion = $3
      WHERE id = $1;
      `,
      [existing.rows[0].id, fecha, descripcion]
    );

    console.log("Actualizado a REAL:", nombre, "-", municipioNombre);
    return { status: "updated" };
  } else {
    await pool.query(
      `
      INSERT INTO festivals (
        nombre,
        fecha,
        descripcion,
        municipio_id,
        source_type,
        verified,
        is_active
      )
      VALUES ($1, $2, $3, $4, 'real', true, true);
      `,
      [nombre, fecha, descripcion, municipio_id]
    );

    console.log("Insertado REAL:", nombre, "-", municipioNombre);
    return { status: "inserted" };
  }
}

async function run() {
  const rows = [];

  try {
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`No existe el archivo: ${csvFilePath}`);
    }

    console.log("Leyendo archivo:", csvFilePath);

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let municipioNoEncontrado = 0;

        for (const row of rows) {
          try {
            const result = await upsertFestival(row);

            if (result.status === "inserted") inserted++;
            else if (result.status === "updated") updated++;
            else if (result.status === "skipped") skipped++;
            else if (result.status === "municipio_no_encontrado") municipioNoEncontrado++;
          } catch (err) {
            console.log("Error en fila:", row, "-", err.message);
            skipped++;
          }
        }

        console.log("----- RESUMEN -----");
        console.log("Insertados:", inserted);
        console.log("Actualizados a REAL:", updated);
        console.log("Omitidos:", skipped);
        console.log("Municipio no encontrado:", municipioNoEncontrado);

        await pool.end();
      });
  } catch (err) {
    console.error("Error:", err.message);
    await pool.end();
    process.exit(1);
  }
}

run();