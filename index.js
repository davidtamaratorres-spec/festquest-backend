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

        fecha_inicio TIMESTAMP,
        fecha_fin TIMESTAMP,

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

// 🔴 CARGA CONTROLADA (REEMPLAZA TODO EL MASTER)
app.get("/__fix/solo-20", async (req, res) => {
  try {
    // BORRAR TODO
    await db.query(`DELETE FROM festivals`);

    // INSERTAR SOLO LOS QUE DEFINAS AQUÍ
    await db.query(`
      INSERT INTO festivals (nombre, fecha_inicio, fecha_fin, municipio_id)
      VALUES
      ('Festival Iberoamericano de Teatro', '2026-03-20', '2026-04-05', 9558),
      ('Semana Santa de Popayán', '2026-03-29', '2026-04-05', 9770),
      ('Procesión del Viernes Santo', '2026-04-03', '2026-04-03', 9770),
      ('Fiestas de San Jorge', '2026-04-23', '2026-04-30', 10424),
      ('Festival de la Leyenda Vallenata', '2026-04-29', '2026-05-02', 9811),
      ('Desfile de Piloneras', '2026-04-29', '2026-04-29', 9811),
      ('Fiestas de San Isidro Labrador Anorí', '2026-05-01', '2026-05-15', 9419),
      ('Fiestas de San Isidro Labrador Cáceres', '2026-05-01', '2026-05-15', 9434)
    `);

    const count = await db.query(`SELECT COUNT(*) FROM festivals`);

    res.json({
      ok: true,
      remaining: count.rows[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
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

// =========================
// MUNICIPALITIES
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
    const result = await db.query(`
      SELECT
        f.id,
        f.nombre,
        f.fecha,
        f.fecha_inicio,
        f.fecha_fin,
        f.descripcion,
        f.municipio_id,
        m.codigo_dane,
        m.nombre AS municipio,
        m.departamento
      FROM festivals f
      LEFT JOIN municipalities m ON f.municipio_id = m.id
      ORDER BY f.fecha_inicio ASC
    `);

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
      `SELECT * FROM festivals WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Festival no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error detalle festival:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Servidor FestQuest Online");
  await initDB();
});