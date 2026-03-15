const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// --- RUTA PRINCIPAL ---
app.get("/", (req, res) => {
  res.send("Servidor Funcionando");
});

// --- RUTA DE FESTIVALES ---
app.get("/api/festivals", async (req, res) => {
  try {
    const result = await db.query(`
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
      ORDER BY f.id ASC
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/festivals:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- RUTA DE MUNICIPIOS ---
app.get("/api/municipalities", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM municipalities
      ORDER BY nombre ASC
      LIMIT 200
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/municipalities:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- OTRAS RUTAS ---
app.use("/api/restaurants", require("./routes/restaurants"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor FestQuest Online");
});