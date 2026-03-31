const express = require("express");
const cors = require("cors");
const path = require("path");
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
        codigo_dane INTEGER,
        subregion VARCHAR(255),
        habitantes TEXT,
        temperatura_promedio TEXT,
        altura TEXT,
        bandera_url TEXT,
        sitios_turisticos TEXT,
        hoteles TEXT,
        contacto_hoteles TEXT
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
        wa_3 TEXT,

        sitios_turisticos TEXT,
        hoteles TEXT,
        contacto_hoteles TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS places (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        maps_link TEXT,
        municipio_id INTEGER REFERENCES municipalities(id) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        whatsapp_link TEXT,
        municipio_id INTEGER REFERENCES municipalities(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Tablas verificadas/creadas correctamente");
  } catch (err) {
    console.error("❌ Error inicializando base:", err.message);
  }
}

function splitPipe(value) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "FestQuest backend",
    status: "running",
  });
});

app.get("/test-email", async (req, res) => {
  const correos = [
    "davidtamaratorres@gmail.com",
    "davidenrique_2000@hotmail.com",
    "david.tamara@udea.edu.co",
  ];

  const resultados = [];

  for (const correo of correos) {
    const ok = await enviarCorreo(
      correo,
      "Prueba FestQuest",
      "Correo funcionando correctamente 🚀"
    );
    resultados.push({ correo, ok });
  }

  res.json({ resultados });
});

app.get("/test-festivals", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        f.id,
        f.nombre,
        f.fecha,
        f.fecha_inicio,
        f.fecha_fin,
        m.nombre AS municipio,
        m.departamento
      FROM festivals f
      LEFT JOIN municipalities m ON f.municipio_id = m.id
      WHERE f.fecha_inicio IS NOT NULL OR f.fecha_fin IS NOT NULL
      ORDER BY f.id DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /test-festivals:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// MUNICIPALITIES LIST
// =========================
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

// =========================
// MUNICIPALITY DETAIL
// =========================
app.get("/api/municipalities/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const municipio = await db.query(
      `SELECT * FROM municipalities WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (municipio.rows.length === 0) {
      return res.status(404).json({ error: "Municipio no encontrado" });
    }

    const m = municipio.rows[0];

    let places = [];
    let hotels = [];

    const placesLegacy = await db.query(
      `SELECT * FROM places WHERE municipio_id = $1`,
      [id]
    );

    const hotelsLegacy = await db.query(
      `SELECT * FROM hotels WHERE municipio_id = $1`,
      [id]
    );

    if (placesLegacy.rows.length > 0) {
      places = placesLegacy.rows;
    } else {
      places = splitPipe(m.sitios_turisticos).map((nombre) => ({
        nombre,
        maps_link: `https://www.google.com/maps/search/${encodeURIComponent(
          `${nombre}, ${m.nombre}, ${m.departamento}, Colombia`
        )}`,
      }));
    }

    if (hotelsLegacy.rows.length > 0) {
      hotels = hotelsLegacy.rows;
    } else {
      const hotelNames = splitPipe(m.hoteles);
      const hotelContacts = splitPipe(m.contacto_hoteles);

      hotels = hotelNames.map((nombre, i) => ({
        nombre,
        whatsapp_link:
          hotelContacts[i] ||
          `https://www.google.com/search?q=${encodeURIComponent(
            `${nombre} ${m.nombre} ${m.departamento} whatsapp`
          )}`,
      }));
    }

    res.json({
      municipio: m,
      places,
      hotels,
    });
  } catch (err) {
    console.error("❌ Error municipio detalle:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// FESTIVALS
// =========================
app.get("/api/festivals", async (req, res) => {
  try {
    const { departamento, municipio, fecha, from, to } = req.query;

    let query = `
      SELECT
        f.id,
        f.nombre,
        f.fecha,
        f.fecha_inicio,
        f.fecha_fin,
        f.descripcion,
        f.municipio_id,
        f.sitios_turisticos,
        f.hoteles,
        f.contacto_hoteles,
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
      query += ` AND (
        $${paramIndex}::date BETWEEN f.fecha_inicio::date AND f.fecha_fin::date
      )`;
      params.push(fecha);
      paramIndex++;
    }

    if (from && to) {
      query += ` AND (
        $${paramIndex}::date BETWEEN f.fecha_inicio::date AND f.fecha_fin::date
        OR
        $${paramIndex + 1}::date BETWEEN f.fecha_inicio::date AND f.fecha_fin::date
        OR
        f.fecha_inicio::date BETWEEN $${paramIndex}::date AND $${paramIndex + 1}::date
      )`;
      params.push(from, to);
      paramIndex += 2;
    } else if (from) {
      query += ` AND f.fecha_fin::date >= $${paramIndex}::date`;
      params.push(from);
      paramIndex++;
    } else if (to) {
      query += ` AND f.fecha_inicio::date <= $${paramIndex}::date`;
      params.push(to);
      paramIndex++;
    }

    query += ` ORDER BY f.fecha_inicio ASC NULLS LAST, f.id ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en /api/festivals:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// FESTIVAL DETAIL
// =========================
app.get("/api/festivals/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT
        f.id,
        f.nombre,
        f.fecha,
        f.fecha_inicio,
        f.fecha_fin,
        f.descripcion,
        f.municipio_id,
        f.sitios_turisticos,
        f.hoteles,
        f.contacto_hoteles,
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Servidor FestQuest Online");
  await initDB();
});