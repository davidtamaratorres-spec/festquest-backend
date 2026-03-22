const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const total = await pool.query("SELECT COUNT(*) FROM festivals");

  const resumen = await pool.query(`
    SELECT source_type, status, COUNT(*) AS total
    FROM festivals
    GROUP BY source_type, status
    ORDER BY source_type, status
  `);

  const muestra = await pool.query(`
    SELECT f.nombre, f.fecha, f.source_type, m.nombre AS municipio
    FROM festivals f
    JOIN municipalities m ON m.id = f.municipio_id
    LIMIT 20
  `);

  console.log("Total festivales:", total.rows[0].count);
  console.table(resumen.rows);
  console.table(muestra.rows);

  process.exit();
}

run();