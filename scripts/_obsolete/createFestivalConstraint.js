const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Creando constraint único...");

    await pool.query(`
      ALTER TABLE festivals
      ADD CONSTRAINT unique_festival_municipio_nombre_year
      UNIQUE (municipio_id, nombre, year);
    `);

    console.log("✅ Constraint creado correctamente");
  } catch (err) {
    console.error("⚠️ Probablemente ya existe o hay duplicados:", err.message);
  } finally {
    await pool.end();
  }
}

run();