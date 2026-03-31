const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const result = await pool.query(`
      SELECT
        m.codigo_dane,
        m.nombre AS municipio,
        m.departamento,
        m.habitantes,
        COUNT(f.id) AS festivales
      FROM municipalities m
      LEFT JOIN festivals f ON f.municipio_id = m.id
      WHERE m.nombre IS NOT NULL
      GROUP BY
        m.codigo_dane,
        m.nombre,
        m.departamento,
        m.habitantes
      ORDER BY
        COUNT(f.id) DESC
      LIMIT 50
    `);

    console.table(result.rows);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  } finally {
    process.exit();
  }
}

run();