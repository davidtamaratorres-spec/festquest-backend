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

function toInt(value) {
  if (!value) return null;
  const clean = String(value).replace(/\./g, "").replace(/,/g, "").trim();
  const n = parseInt(clean, 10);
  return Number.isNaN(n) ? null : n;
}

function toDecimal(value) {
  if (!value) return null;
  const clean = String(value).replace(",", ".").trim();
  const n = parseFloat(clean);
  return Number.isNaN(n) ? null : n;
}

async function updateMunicipalities() {
  if (!fs.existsSync(csvFilePath)) {
    console.error("❌ No se encontró el CSV en:", csvFilePath);
    process.exit(1);
  }

  const rows = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
      rows.push(row);
    })
    .on("end", async () => {
      console.log("Filas leídas:", rows.length);

      let updated = 0;
      let notFound = 0;
      let errors = 0;

      for (const row of rows) {
        const codigo = row.Codigo_id?.trim(); // ← correcto ahora
        const subregion = row.Subregion?.trim() || null;
        const habitantes = toInt(row.habitantes);
        const temperatura = toDecimal(row.temperatura_promedio);
        const altura = toInt(row.altura);

        if (!codigo) continue;

        try {
          const result = await pool.query(
            `
            UPDATE municipalities
            SET
              subregion = $1,
              habitantes = $2,
              temperatura_promedio = $3,
              altura = $4
            WHERE codigo_dane = $5
            `,
            [subregion, habitantes, temperatura, altura, codigo]
          );

          if (result.rowCount > 0) {
            updated++;
          } else {
            notFound++;
            console.log("No encontrado:", codigo);
          }
        } catch (error) {
          errors++;
          console.error("Error:", codigo, error.message);
        }
      }

      console.log("\nProceso terminado");
      console.log("Actualizados:", updated);
      console.log("No encontrados:", notFound);
      console.log("Errores:", errors);

      await pool.end();
    })
    .on("error", async (error) => {
      console.error("Error leyendo CSV:", error.message);
      await pool.end();
      process.exit(1);
    });
}

updateMunicipalities();