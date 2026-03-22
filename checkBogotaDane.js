const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log("Corrigiendo Bogotá...");

    // Buscar si existe algo parecido
    const check = await pool.query(`
      SELECT id, nombre, codigo_dane 
      FROM municipalities
      WHERE codigo_dane = '11001'
    `);

    if (check.rows.length === 0) {
      console.log("Insertando Bogotá...");

      await pool.query(`
        INSERT INTO municipalities (nombre, departamento, codigo_dane)
        VALUES ('Bogotá', 'Cundinamarca', '11001')
      `);

      console.log("✅ Bogotá insertado");
    } else {
      console.log("✔ Bogotá ya existe:", check.rows[0]);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

run();