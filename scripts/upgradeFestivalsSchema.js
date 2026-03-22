const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Actualizando esquema de festivals...");

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS year INTEGER;
    `);

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS date_start DATE;
    `);

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS date_end DATE;
    `);

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmado';
    `);

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);
    `);

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS source_url TEXT;
    `);

    await pool.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `);

    console.log("✅ Esquema de festivals actualizado correctamente");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();