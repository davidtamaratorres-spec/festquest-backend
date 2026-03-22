const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const filePath = path.join(__dirname, "..", "data_std", "municipios_enrichment_hybrid.csv");

async function run() {
  const rows = [];

  console.log("Leyendo CSV...");

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      console.log("Filas leídas:", rows.length);

      let updated = 0;

      for (const r of rows) {
        const codigo = String(parseInt(r.codigo_dane));

        // 🔹 CONCATENAR SITIOS
        const sitios = [
          r.sitio_1,
          r.sitio_2,
          r.sitio_3
        ].filter(Boolean).join(" | ");

        // 🔹 CONCATENAR HOTELES
        const hoteles = [
          r.hotel_1,
          r.hotel_2,
          r.hotel_3
        ].filter(Boolean).join(" | ");

        // 🔹 CONCATENAR CONTACTOS
        const contacto = [
          r.wa_1,
          r.wa_2,
          r.wa_3
        ].filter(Boolean).join(" | ");

        const result = await pool.query(
          `
          UPDATE municipalities
          SET 
            sitios_turisticos = $1,
            hoteles = $2,
            contacto_hoteles = $3
          WHERE codigo_dane = $4
          `,
          [sitios || null, hoteles || null, contacto || null, codigo]
        );

        if (result.rowCount > 0) updated++;
      }

      console.log("Municipios actualizados:", updated);

      await pool.end();
      process.exit();
    })
    .on("error", (err) => {
      console.error("Error CSV:", err.message);
      process.exit(1);
    });
}

run();