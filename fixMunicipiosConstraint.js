const db = require("./db");

async function fix() {
  try {
    await db.query(`
      ALTER TABLE municipalities
      ADD CONSTRAINT municipalities_nombre_unique UNIQUE (nombre);
    `);

    console.log("✅ Constraint UNIQUE creado en municipalities.nombre");
  } catch (err) {
    if (
      err.message.includes("already exists") ||
      err.message.includes("relation") ||
      err.message.includes("duplicate")
    ) {
      console.log("ℹ️ El constraint ya existía o no se pudo crear porque ya hay un conflicto");
      console.log(err.message);
    } else {
      console.error("❌ Error:", err.message);
    }
  }

  process.exit(0);
}

fix();