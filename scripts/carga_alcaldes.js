const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const results = [];
const csvPath = path.join(__dirname, "..", "data", "alcaldes_colombia_actualizado.csv");

fs.createReadStream(csvPath)
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", async () => {
    try {
      console.log("Filas leídas:", results.length);

      const client = await pool.connect();

      await client.query("BEGIN");

      for (const row of results) {
        const codigo = String(row.codigo_dane || "").padStart(5, "0").trim();
        const mandatario = (row.mandatario || "").trim();

        if (!codigo || !mandatario) continue;

        await client.query(
          `UPDATE municipalities
           SET mandatario_local = $1
           WHERE codigo_dane = $2`,
          [mandatario, codigo]
        );
      }

      await client.query("COMMIT");

      console.log("✅ Actualización completa");

      client.release();
      await pool.end();
      process.exit(0);

    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  })
  .on("error", (error) => {
    console.error("❌ Error leyendo CSV:", error.message);
    process.exit(1);
  });