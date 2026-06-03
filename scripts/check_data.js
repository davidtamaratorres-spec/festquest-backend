const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const total = await pool.query("SELECT COUNT(*) FROM municipalities");
  const sample = await pool.query(`
    SELECT nombre, departamento, codigo_dane, subregion, temperatura_promedio, altura
    FROM municipalities
    LIMIT 10
  `);

  console.log("Total municipios:", total.rows[0].count);
  console.table(sample.rows);

  process.exit();
}

run();