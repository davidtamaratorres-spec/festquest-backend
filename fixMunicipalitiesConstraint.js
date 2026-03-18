const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Verificando restricciones de municipalities...");

    const before = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'municipalities'::regclass
      ORDER BY conname;
    `);

    console.log("Antes:");
    before.rows.forEach(r => console.log("-", r.conname));

    await pool.query(`
      ALTER TABLE municipalities
      DROP CONSTRAINT IF EXISTS municipalities_nombre_unique;
    `);

    console.log("Intento de eliminación ejecutado.");

    const after = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'municipalities'::regclass
      ORDER BY conname;
    `);

    console.log("Después:");
    after.rows.forEach(r => console.log("-", r.conname));

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

run();