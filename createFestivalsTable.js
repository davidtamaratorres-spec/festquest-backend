const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Creando tabla festivals...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS festivals (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        fecha DATE,
        municipio_id INTEGER NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("OK - tabla festivals lista");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

run();