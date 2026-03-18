const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM municipalities");
    console.log("Total municipios en DB:", result.rows[0].count);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

run();