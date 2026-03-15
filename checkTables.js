const db = require("./db");

async function checkTables() {
  try {
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("Tablas en la base de datos:");
    result.rows.forEach(t => console.log("-", t.table_name));

  } catch (err) {
    console.error("Error consultando tablas:", err.message);
  }

  process.exit();
}

checkTables();