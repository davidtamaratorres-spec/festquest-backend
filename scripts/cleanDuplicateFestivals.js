const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("🧹 Eliminando duplicados...");

    await pool.query(`
      DELETE FROM festivals a
      USING festivals b
      WHERE a.id > b.id
      AND a.municipio_id = b.municipio_id
      AND a.nombre = b.nombre
      AND a.year = b.year;
    `);

    console.log("✅ Duplicados eliminados");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();