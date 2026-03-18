const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'municipalities'
      ORDER BY ordinal_position;
    `);

    console.log("Columnas en municipalities:");
    console.log("--------------------------------");

    result.rows.forEach((row) => {
      console.log(row.column_name);
    });
  } catch (error) {
    console.error("Error consultando columnas:", error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();