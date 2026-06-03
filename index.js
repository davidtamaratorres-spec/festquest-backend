const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();

app.use(cors({
  origin: [
    'https://festquest.app',
    'https://www.festquest.app',
    'http://localhost:3000',
    'http://localhost:8081'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Rutas principales FestQuest
app.get("/api/festivals", async (req, res) => {
  try {
    const { municipio, departamento, fecha, fecha_inicio, fecha_fin } = req.query;

    let query = `
      SELECT
        f.id,
        f.nombre,
        f.fecha,
        TO_CHAR(f.fecha_inicio, 'YYYY-MM-DD') AS date_start,
        TO_CHAR(f.fecha_fin,    'YYYY-MM-DD') AS date_end,
        f.descripcion,
        f.lugar_encuentro,
        f.maps_link,
        f.whatsapp_link,
        f.codigo_dane,
        m.id   AS municipio_id,
        m.nombre AS municipio,
        m.departamento
      FROM festivals f
      LEFT JOIN municipalities m ON f.municipio_id = m.id
      WHERE 1=1
    `;

    const params = [];

    if (municipio) {
      params.push(municipio);
      query += ` AND LOWER(m.nombre) = LOWER($${params.length})`;
    }

    if (departamento) {
      params.push(departamento);
      query += ` AND LOWER(m.departamento) = LOWER($${params.length})`;
    }

    if (fecha) {
      params.push(fecha);
      query += ` AND $${params.length}::date BETWEEN f.fecha_inicio AND f.fecha_fin`;
    }

    if (fecha_inicio && fecha_fin) {
      params.push(fecha_fin);
      query += ` AND f.fecha_inicio <= $${params.length}::date`;
      params.push(fecha_inicio);
      query += ` AND f.fecha_fin >= $${params.length}::date`;
    }

    query += ` ORDER BY f.fecha_inicio ASC, f.id ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error /api/festivals:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/festivals/:id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        f.id, f.nombre,
        TO_CHAR(f.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        TO_CHAR(f.fecha_fin,    'YYYY-MM-DD') AS fecha_fin,
        f.descripcion, f.lugar_encuentro, f.maps_link, f.whatsapp_link,
        f.municipio_id,
        m.nombre AS municipio, m.departamento,
        m.subregion, m.habitantes, m.temperatura_promedio, m.altura,
        m.sitios_turisticos, m.hoteles
       FROM festivals f
       LEFT JOIN municipalities m ON f.municipio_id = m.id
       WHERE f.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Festival no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error /api/festivals/:id:", err.message);
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
    console.error("Error /api/municipalities:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/municipalities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await db.query(
      `SELECT
         m.id, m.nombre, m.departamento, m.subregion,
         m.habitantes, m.temperatura_promedio, m.altura,
         m.gentilicio, m.alcalde, m.correo_alcalde,
         m.sitios_turisticos, m.hoteles, m.contacto_hoteles,
         m.codigo_dane, m.bandera_url,
         (SELECT COUNT(*) FROM festivals f WHERE f.municipio_id = m.id) AS "festivalsCount"
       FROM municipalities m
       WHERE m.id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Municipio no encontrado" });

    function splitPipe(value) {
      if (!value) return [];
      return String(value).split("|").map((s) => s.trim()).filter(Boolean);
    }

    const placesNames = splitPipe(row.sitios_turisticos);
    const hotelsNames = splitPipe(row.hoteles);
    const contacts    = splitPipe(row.contacto_hoteles);

    const places = placesNames.map((nombre) => ({
      nombre,
      maps_link: `https://www.google.com/maps/search/${encodeURIComponent(nombre)}`,
    }));

    const hotels = hotelsNames.map((nombre, i) => ({
      nombre,
      whatsapp_link: contacts[i] || `https://www.google.com/search?q=${encodeURIComponent(nombre + " whatsapp")}`,
    }));

    res.json({ municipio: row, places, hotels });
  } catch (err) {
    console.error("Error /api/municipalities/:id:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Rutas DishQuest integradas
app.use("/api/restaurants", require("./routes/restaurants"));
app.use("/api/dishes", require("./routes/dishes"));
app.use("/api/promotions", require("./routes/promotions"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/partners", require("./routes/partners"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor FestQuest + DishQuest Online");
});