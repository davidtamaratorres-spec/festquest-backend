const db = require("./db");

async function limpiarDuplicados() {
  try {

    console.log("Buscando duplicados...");

    const result = await db.query(`
      DELETE FROM festivals a
      USING festivals b
      WHERE a.id < b.id
      AND a.nombre = b.nombre
      AND a.municipio_id = b.municipio_id
      RETURNING a.id;
    `);

    console.log("Duplicados eliminados:", result.rowCount);

    const total = await db.query(`SELECT COUNT(*) FROM festivals`);

    console.log("Festivales actuales:", total.rows[0].count);

  } catch (err) {
    console.error("Error:", err.message);
  }

  process.exit();
}

limpiarDuplicados();