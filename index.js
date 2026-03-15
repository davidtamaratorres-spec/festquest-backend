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
        departamento VARCHAR(255)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS festivals (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255),
        fecha VARCHAR(100),
        descripcion TEXT,
        municipio_id INTEGER REFERENCES municipalities(id),
        habitantes TEXT,
        altura TEXT,
        lugar_encuentro TEXT,
        maps_link TEXT,
        whatsapp_link TEXT
      );
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
        f.habitantes,
        f.altura,
        f.lugar_encuentro,
        f.maps_link,
        f.whatsapp_link,
        m.nombre AS municipio,
        m.departamento
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