const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =========================
// MAIL CONFIG
// =========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarCorreo(destino, asunto, texto) {
  try {
    const info = await transporter.sendMail({
      from: `"FestQuest" <${process.env.EMAIL_USER}>`,
      to: destino,
      subject: asunto,
      text: texto,
    });

    console.log("Correo enviado:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error correo:", error);
    return false;
  }
}

// =========================
// INIT DB
// =========================
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

// =========================
// HELPERS
// =========================
function splitPipe(value) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

// =========================
// ROUTES
// =========================

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

// 👉 TEST EMAIL
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
// RESTO DE TUS RUTAS (IGUAL)
// =========================

// MUNICIPALITIES
app.get("/api/municipalities", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM municipalities
      ORDER BY nombre ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// MUNICIPALITY DETAIL
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
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Servidor FestQuest Online");
  await initDB();
});