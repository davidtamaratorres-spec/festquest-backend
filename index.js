const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const db = require("./db");
const { enviarCorreo } = require("./mailer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS municipalities (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) UNIQUE NOT NULL,
        departamento VARCHAR(255),
        codigo_dane INTEGER
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

    console.log("✅ Tablas listas");
  } catch (err) {
    console.error(err.message);
  }
}

// 🔴 CARGA DESDE CSV (MASTER ABRIL MAYO)
app.get("/__fix/load-abril-mayo", async (req, res) => {
  try {
    // LIMPIAR
    await db.query(`DELETE FROM festivals`);
    await db.query(`DELETE FROM municipalities`);

    const results = [];

    fs.createReadStream(path.join(__dirname, "data", "master_abril_mayo.csv"))
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        const municipiosMap = {};

        for (const r of results) {
          const nombre = r.municipio?.trim();
          const departamento = r.departamento?.trim();
          const codigo = parseInt(r.codigo_dane);

          if (!municipiosMap[nombre]) {
            const m = await db.query(
              `INSERT INTO municipalities (nombre, departamento, codigo_dane)
               VALUES ($1,$2,$3) RETURNING id`,
              [nombre, departamento, codigo]
            );
            municipiosMap[nombre] = m.rows[0].id;
          }

          if (r.festival && r.fecha_inicio && r.fecha_fin) {
            await db.query(
              `INSERT INTO festivals (nombre, fecha_inicio, fecha_fin, municipio_id)
               VALUES ($1,$2,$3,$4)`,
              [
                r.festival,
                r.fecha_inicio,
                r.fecha_fin,
                municipiosMap[nombre],
              ]
            );
          }
        }

        const count = await db.query(`SELECT COUNT(*) FROM festivals`);

        res.json({
          ok: true,
          festivals: count.rows[0].count,
          municipios: Object.keys(municipiosMap).length,
        });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API FESTIVALS
app.get("/api/festivals", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT f.*, m.nombre as municipio, m.departamento
      FROM festivals f
      JOIN municipalities m ON f.municipio_id = m.id
      ORDER BY f.fecha_inicio ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API MUNICIPALITIES
app.get("/api/municipalities", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM municipalities`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Servidor FestQuest Online");
  await initDB();
});