const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const outputPath = path.join(__dirname, "..", "data", "festivals_raw_big.csv");

async function run() {
  try {
    console.log("Generando festivales base masivos...");

    const res = await pool.query(`
      SELECT nombre, codigo_dane, departamento
      FROM municipalities
      WHERE codigo_dane IS NOT NULL
    `);

    const rows = res.rows;

    const output = [];
    output.push("municipio,codigo_dane,nombre,fecha_text,source_name,source_url,departamento");

    for (const m of rows) {
      const nombreFestival = `Fiestas de ${m.nombre}`;

      output.push([
        m.nombre,
        m.codigo_dane,
        nombreFestival,
        "Por definir",
        "Generado automáticamente",
        "",
        m.departamento
      ].join(","));
    }

    fs.writeFileSync(outputPath, output.join("\n"), "utf8");

    console.log("✅ Generación completa");
    console.log("Festivales generados:", rows.length);
    console.log("Archivo:", outputPath);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

run();