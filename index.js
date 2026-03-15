const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS municipalities (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) UNIQUE NOT NULL,
        departamento VARCHAR(255),
        codigo_dane INTEGER,
        subregion VARCHAR(255),
        habitantes TEXT,
        temperatura_promedio TEXT,
        altura TEXT,
        bandera_url TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS festivals (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255),
        fecha VARCHAR(100),
        descripcion TEXT,
        municipio_id INTEGER REFERENCES municipalities(id),

        sitio_1 TEXT,
        maps_1 TEXT,
        sitio_2 TEXT,
        maps_2 TEXT,
        sitio_3 TEXT,
        maps_3 TEXT,

        hotel_1 TEXT,
        wa_1 TEXT,
        hotel_2 TEXT,
        wa_2 TEXT,
        hotel_3 TEXT,
        wa_3 TEXT
      );
    `);

    await db.query(`
      ALTER TABLE municipalities
      ADD COLUMN IF NOT EXISTS codigo_dane INTEGER,
      ADD COLUMN IF NOT EXISTS subregion VARCHAR(255),
      ADD COLUMN IF NOT EXISTS habitantes TEXT,
      ADD COLUMN IF NOT EXISTS temperatura_promedio TEXT,
      ADD COLUMN IF NOT EXISTS altura TEXT,
      ADD COLUMN IF NOT EXISTS bandera_url TEXT;
    `);

    await db.query(`
      ALTER TABLE festivals
      ADD COLUMN IF NOT EXISTS sitio_1 TEXT,
      ADD COLUMN IF NOT EXISTS maps_1 TEXT,
      ADD COLUMN IF NOT EXISTS sitio_2 TEXT,
      ADD COLUMN IF NOT EXISTS maps_2 TEXT,
      ADD COLUMN IF NOT EXISTS sitio_3 TEXT,
      ADD COLUMN IF NOT EXISTS maps_3 TEXT,
      ADD COLUMN IF NOT EXISTS hotel_1 TEXT,
      ADD COLUMN IF NOT EXISTS wa_1 TEXT,
      ADD COLUMN IF NOT EXISTS hotel_2 TEXT,
      ADD COLUMN IF NOT EXISTS wa_2 TEXT,
      ADD COLUMN IF NOT EXISTS hotel_3 TEXT,
      ADD COLUMN IF NOT EXISTS wa_3 TEXT;
    `);

    console.log("✅ Tablas verificadas/creadas correctamente");
  } catch (err) {
    console.error("❌ Error inicializando base:", err.message);
  }
}

app.get("/", (req, res) => {
  res.send("Servidor FestQuest funcionando");
});

app.get("/api/festivals", async (req, res) => {
  try {
    const { departamento, municipio, fecha } = req.query;

    let query = `
      SELECT
        f.id,
        f.nombre,
        f.fecha,
        f.descripcion,
        f.municipio_id,

        f.sitio_1,
        f.maps_1,
        f.sitio_2,
        f.maps_2,
        f.sitio_3,
        f.maps_3,

        f.hotel_1,
        f.wa_1,
        f.hotel_2,
        f.wa_2,
        f.hotel_3,
        f.wa_3,

        m.codigo_dane,
        m.nombre AS municipio,
        m.departamento,
        m.subregion,
        m.habitantes,
        m.temperatura_promedio,
        m.altura,
        m.bandera_url
      FROM festivals f
      LEFT JOIN municipalities m ON f.municipio_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (departamento) {
      query += ` AND LOWER(m.departamento) = LOWER($${paramIndex})`;
      params.push(departamento);
      paramIndex++;
    }

    if (municipio) {
      query += ` AND LOWER(m.nombre) = LOWER($${paramIndex})`;
      params.push(municipio);
      paramIndex++;
    }

    if (fecha) {
      query += ` AND f.fecha LIKE $${paramIndex}`;
      params.push(`${fecha}%`);
      paramIndex++;
    }

    query += ` ORDER BY f.fecha ASC, f.id ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/festivals:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/festivals/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT
        f.id,
        f.nombre,
        f.fecha,
        f.descripcion,
        f.municipio_id,

        f.sitio_1,
        f.maps_1,
        f.sitio_2,
        f.maps_2,
        f.sitio_3,
        f.maps_3,

        f.hotel_1,
        f.wa_1,
        f.hotel_2,
        f.wa_2,
        f.hotel_3,
        f.wa_3,

        m.codigo_dane,
        m.nombre AS municipio,
        m.departamento,
        m.subregion,
        m.habitantes,
        m.temperatura_promedio,
        m.altura,
        m.bandera_url
      FROM festivals f
      LEFT JOIN municipalities m ON f.municipio_id = m.id
      WHERE f.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Festival no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error en /api/festivals/:id", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/municipalities", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM municipalities
      ORDER BY nombre ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/municipalities:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Servidor FestQuest Online");
  await initDB();
});