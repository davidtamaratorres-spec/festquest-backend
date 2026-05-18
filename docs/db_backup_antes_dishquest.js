const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const crearTablas = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS municipalities (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) UNIQUE NOT NULL,
      departamento VARCHAR(255),
      codigo_dane INTEGER
    );

    CREATE TABLE IF NOT EXISTS festivals (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      fecha VARCHAR(100),
      fecha_inicio DATE,
      fecha_fin DATE,
      descripcion TEXT,
      municipio_id INTEGER REFERENCES municipalities(id),
      habitantes INTEGER,
      altura INTEGER,
      lugar_encuentro TEXT,
      maps_link TEXT,
      whatsapp_link TEXT
    );

    ALTER TABLE municipalities
      ADD COLUMN IF NOT EXISTS nombre VARCHAR(255),
      ADD COLUMN IF NOT EXISTS departamento VARCHAR(255),
      ADD COLUMN IF NOT EXISTS codigo_dane INTEGER;

    ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS nombre VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fecha VARCHAR(100),
      ADD COLUMN IF NOT EXISTS fecha_inicio DATE,
      ADD COLUMN IF NOT EXISTS fecha_fin DATE,
      ADD COLUMN IF NOT EXISTS descripcion TEXT,
      ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES municipalities(id),
      ADD COLUMN IF NOT EXISTS habitantes INTEGER,
      ADD COLUMN IF NOT EXISTS altura INTEGER,
      ADD COLUMN IF NOT EXISTS lugar_encuentro TEXT,
      ADD COLUMN IF NOT EXISTS maps_link TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;
  `;
  try {
    await pool.query(queryText);
    console.log("✅ Tablas verificadas/creadas correctamente");
  } catch (err) {
    console.error("❌ Error creando tablas:", err.message);
  }
};

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error de conexión', err.stack);
  }
  console.log('✅ Conexión a PostgreSQL exitosa');
  crearTablas(); // Esto crea las tablas automáticamente
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
