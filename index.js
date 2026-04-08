const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
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

// 🔴 CARGA DESDE CSV (ROBUSTA)
app.get("/__fix/load-abril-mayo", async (req, res) => {
  try {
    await db.query(`DELETE FROM festivals`);
    await db.query(`DELETE FROM municipalities`);

    const results = [];

    fs.createReadStream(path.join(__dirname, "data", "master_abril_mayo.csv"))
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        const municipiosMap = {};

        for (const r of results) {
          const codigo = parseInt(
            r.codigo_dane || r.CODIGO_DANE || r.dane
          );

          const municipio =
            r.municipio || r.MUNICIPIO || r.ciudad;

          const departamento =
            r.departamento || r.DEPARTAMENTO;

          if (!codigo || !municipio) continue;

          if (!municipiosMap[codigo]) {
            const m = await db.query(
              `INSERT INTO municipalities (nombre, departamento, codigo_dane)
               VALUES ($1,$2,$3)
               ON CONFLICT (codigo_dane) DO UPDATE SET nombre=EXCLUDED.nombre
               RETURNING id`,
              [municipio, departamento, codigo]
            );
            municipiosMap[codigo] = m.rows[0].id;
          }

          const nombreFestival =
            r.festival || r.FESTIVAL || r.nombre || r.EVENTO;

          const fechaInicio =
            r.fecha_inicio || r.FECHA_INICIO || r.inicio || r.fecha;

          const fechaFin =
            r.fecha_fin || r.FECHA_FIN || r.fin || r.fecha;

          if (nombreFestival && fechaInicio && fechaFin) {
            await db.query(
              `INSERT INTO festivals (nombre, fecha_inicio, fecha_fin, municipio_id)
               VALUES ($1,$2,$3,$4)`,
              [
                nombreFestival,
                fechaInicio,
                fechaFin,
                municipiosMap[codigo],
              ]
            );
          }
        }

        const f = await db.query(`SELECT COUNT(*) FROM festivals`);
        const m = await db.query(`SELECT COUNT(*) FROM municipalities`);

        res.json({
          ok: true,
          festivals: f.rows[0].count,
          municipios: m.rows[0].count,
        });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API
app.get("/api/festivals", async (req, res) => {
  const result = await db.query(`
    SELECT f.*, m.nombre as municipio, m.departamento
    FROM festivals f
    JOIN municipalities m ON f.municipio_id = m.id
    ORDER BY f.fecha_inicio ASC
  `);
  res.json(result.rows);
});

app.get("/api/municipalities", async (req, res) => {
  const result = await db.query(`SELECT * FROM municipalities`);
  res.json(result.rows);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Servidor FestQuest Online");
  await initDB();
});