const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const run = async () => {
  try {
    console.log("Creando tabla hotels...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        whatsapp_link TEXT,
        municipio_id INTEGER REFERENCES municipalities(id) ON DELETE CASCADE
      );
    `);

    console.log("OK - tabla hotels lista");
    process.exit();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

run();