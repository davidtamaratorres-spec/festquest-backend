const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Corrigiendo tabla festivals...");

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
    `);

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS fecha_fin DATE;
    `);

    console.log("Columnas creadas correctamente");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

run();