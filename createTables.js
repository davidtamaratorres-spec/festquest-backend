const db = require("./db");

async function crearTablas() {
  try {

    await db.query(`
      CREATE TABLE IF NOT EXISTS municipalities (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) UNIQUE NOT NULL,
        departamento VARCHAR(255)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS festivals (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        fecha VARCHAR(100),
        descripcion TEXT,
        municipio_id INTEGER REFERENCES municipalities(id),
        habitantes INTEGER,
        altura INTEGER,
        lugar_encuentro TEXT,
        maps_link TEXT,
        whatsapp_link TEXT
      );
    `);

    console.log("✅ Tablas creadas o verificadas correctamente");

  } catch (err) {
    console.error("❌ Error creando tablas:", err.message);
  }

  process.exit();
}

crearTablas();