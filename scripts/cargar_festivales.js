const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const filePath = path.join(__dirname, "..", "data", "festivales_maestro_2026.csv");

async function run() {
  try {
    console.log("🚀 Iniciando carga de festivales...");

    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", async () => {
        console.log(`📊 Filas leídas: ${rows.length}`);

        let inserted = 0;

        for (const row of rows) {
          const codigo = String(row.codigo_dane).padStart(5, "0");
          const departamento = row.departamento?.trim();
          const municipio = row.municipio?.trim();
          const nombre = row.festival?.trim();
          const fecha_inicio = row.fecha_inicio || null;
          const fecha_fin = row.fecha_fin || null;

          if (!codigo || !nombre) continue;

          // Buscar municipio
          const muniRes = await pool.query(
            "SELECT id FROM municipalities WHERE codigo_dane = $1",
            [codigo]
          );

          if (muniRes.rows.length === 0) {
            console.log(`⚠️ Municipio no encontrado: ${codigo} - ${municipio}`);
            continue;
          }

          const municipio_id = muniRes.rows[0].id;

          // Insertar festival
          await pool.query(
            `
            INSERT INTO festivals (
              nombre,
              fecha_inicio,
              fecha_fin,
              municipio_id
            )
            VALUES ($1, $2, $3, $4)
            `,
            [nombre, fecha_inicio, fecha_fin, municipio_id]
          );

          inserted++;
        }

        console.log(`✅ Insertados: ${inserted}`);
        process.exit();
      });
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

run();