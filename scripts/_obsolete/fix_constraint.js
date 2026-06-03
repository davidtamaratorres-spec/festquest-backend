const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE municipalities
      DROP CONSTRAINT IF EXISTS municipalities_codigo_dane_key;
    `);

    await pool.query(`
      ALTER TABLE municipalities
      ADD CONSTRAINT municipalities_codigo_dane_key UNIQUE (codigo_dane);
    `);

    console.log("✅ Constraint aplicado");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();