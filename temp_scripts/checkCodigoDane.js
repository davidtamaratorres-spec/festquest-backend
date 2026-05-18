const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM municipalities");
    const conCodigo = await pool.query(
      "SELECT COUNT(*) FROM municipalities WHERE codigo_dane IS NOT NULL"
    );

    console.log("Total municipios:", total.rows[0].count);
    console.log("Con codigo_dane:", conCodigo.rows[0].count);

    const sample = await pool.query(
      "SELECT nombre, codigo_dane FROM municipalities LIMIT 10"
    );

    console.log("\nEjemplo datos:");
    console.table(sample.rows);

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

run();