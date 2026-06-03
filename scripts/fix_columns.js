const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log("🔧 Ajustando columnas...");

  await pool.query(`
    ALTER TABLE festivals
    ALTER COLUMN status TYPE VARCHAR(50);
  `);

  await pool.query(`
    ALTER TABLE festivals
    ALTER COLUMN source_type TYPE VARCHAR(50);
  `);

  console.log("✅ Columnas ampliadas");

  process.exit();
}

run();