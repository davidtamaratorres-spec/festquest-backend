const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  try {
    console.log("Insertando festivales...");

    await pool.query(`
      INSERT INTO festivals (nombre, fecha, municipio_id)
      VALUES
      ('Festival Ponedera', '2026-01-02', 2827),
      ('Fiestas Sabanagrande', '2026-01-04', 2830),
      ('Carnaval Santa Lucía', '2026-02-14', 2832)
    `);

    console.log("✅ Festivales insertados correctamente");
  } catch (error) {
    console.error("❌ Error insertando:", error.message);
  } finally {
    await pool.end();
  }
}

seed();