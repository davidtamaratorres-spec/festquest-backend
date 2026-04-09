const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS municipalities (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255),
      departamento VARCHAR(255),
      codigo_dane INTEGER UNIQUE
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS festivals (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(255),
      fecha_inicio DATE,
      fecha_fin DATE,
      municipio_id INTEGER REFERENCES municipalities(id)
    );
  `);
}

// 🔴 API CON FILTROS (RANGO CORRECTO)
app.get("/api/festivals", async (req, res) => {
  try {
    const { municipio, departamento, fecha } = req.query;

    let query = `
      SELECT 
        f.id,
        f.nombre,
        f.fecha_inicio AS date_start,
        f.fecha_fin AS date_end,
        m.nombre AS municipio,
        m.departamento
      FROM festivals f
      JOIN municipalities m ON f.municipio_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (municipio) {
      query += ` AND LOWER(m.nombre) = LOWER($${i})`;
      params.push(municipio);
      i++;
    }

    if (departamento) {
      query += ` AND LOWER(m.departamento) = LOWER($${i})`;
      params.push(departamento);
      i++;
    }

    // 🔴 FILTRO POR FECHA (RANGO)
    if (fecha) {
      query += ` AND $${i}::date BETWEEN f.fecha_inicio AND f.fecha_fin`;
      params.push(fecha);
      i++;
    }

    query += ` ORDER BY f.fecha_inicio ASC`;

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API MUNICIPALITIES
app.get("/api/municipalities", async (req, res) => {
  const result = await db.query(`SELECT * FROM municipalities`);
  res.json(result.rows);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Servidor FestQuest Online");
  await initDB();
});