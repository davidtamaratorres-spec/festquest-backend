const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));

const ALLOWED_ORIGINS = [
  "https://festquest.app",
  "https://www.festquest.app",
  "http://localhost:3000",
  "http://localhost:8081",
  "exp://localhost:8081",
];
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error("CORS bloqueado: " + origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
}));
app.options("*", cors());

app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { error: "Demasiadas solicitudes." } }));
app.use("/api/municipio/:id/actualizar", rateLimit({ windowMs: 60 * 1000, max: 10 }));

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
        f.foto_url,
        m.id   AS municipio_id,
        m.nombre AS municipio,
        m.departamento,
        m.subregion
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
        f.foto_url, f.foto_prompt,
        f.municipio_id,
        m.nombre AS municipio, m.departamento,
        m.subregion, m.habitantes, m.temperatura_promedio, m.altura,
        m.gentilicio, m.mandatario AS alcalde, m.correo_alcalde,
        m.telefono AS telefono_municipio, m.sitio_web,
        m.descripcion AS descripcion_municipio,
        m.sitio_1, m.maps_1, m.sitio_2, m.maps_2, m.sitio_3, m.maps_3,
        m.hotel_1, m.wa_1, m.hotel_2, m.wa_2, m.hotel_3, m.wa_3
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

    const [muniResult, festivalesResult] = await Promise.all([
      db.query(
        `SELECT
           m.id, m.nombre, m.departamento, m.subregion,
           m.habitantes, m.temperatura_promedio, m.altura,
           m.gentilicio, m.mandatario AS alcalde, m.correo_alcalde,
           m.telefono, m.descripcion, m.sitio_web,
           m.sitios_turisticos, m.hoteles, m.contacto_hoteles,
           m.codigo_dane, m.bandera_url, m.escudo_url,
           m.latitud, m.longitud,
           m.sitio_1, m.maps_1, m.sitio_2, m.maps_2, m.sitio_3, m.maps_3,
           m.hotel_1, m.wa_1, m.hotel_2, m.wa_2, m.hotel_3, m.wa_3
         FROM municipalities m
         WHERE m.id = $1`,
        [id]
      ),
      db.query(
        `SELECT id, nombre, descripcion, foto_url, maps_link,
           TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
           TO_CHAR(fecha_fin,    'YYYY-MM-DD') AS fecha_fin
         FROM festivals
         WHERE municipio_id = $1
         ORDER BY fecha_inicio ASC NULLS LAST, id ASC`,
        [id]
      ),
    ]);

    const row = muniResult.rows[0];
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

    res.json({ municipio: row, places, hotels, festivals: festivalesResult.rows });
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

// Rutas formulario municipios
const municipioForm = require("./routes/municipioForm");
app.use("/", municipioForm);

// Política de privacidad
app.get("/privacidad", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidad — FestQuest</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 780px; margin: 48px auto; padding: 0 24px; color: #1f2937; line-height: 1.7; }
    h1 { color: #c2410c; font-size: 2rem; margin-bottom: 4px; }
    h2 { color: #c2410c; font-size: 1.2rem; margin-top: 2rem; }
    a { color: #ea580c; }
    .updated { color: #6b7280; font-size: 0.9rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>Política de Privacidad</h1>
  <p class="updated">Última actualización: junio de 2026</p>

  <p>FestQuest (<strong>festquest.app</strong>) es una plataforma de descubrimiento de festividades y cultura colombiana. Nos comprometemos a proteger tu privacidad.</p>

  <h2>1. Datos personales</h2>
  <p>FestQuest <strong>no recopila, almacena ni procesa datos personales</strong> de sus visitantes. No existen formularios de registro, cuentas de usuario ni sistemas de autenticación para el público general.</p>

  <h2>2. Análisis de tráfico (Google Analytics 4)</h2>
  <p>Utilizamos Google Analytics 4 (GA4) con <strong>anonimización de IP activada</strong> para entender el uso general de la plataforma (páginas visitadas, tiempo en sitio, dispositivos). GA4 no nos permite identificar a usuarios individuales. Para más información, consulta la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">política de privacidad de Google</a>.</p>

  <h2>3. Cookies</h2>
  <p>GA4 puede establecer cookies de análisis anónimas (<code>_ga</code>, <code>_gid</code>). No utilizamos cookies de publicidad ni de seguimiento de terceros.</p>

  <h2>4. Datos de municipios y festivales</h2>
  <p>La información de municipios, festivales y autoridades locales que aparece en la plataforma proviene de fuentes públicas y bases de datos oficiales de Colombia. No corresponde a datos personales de usuarios de la plataforma.</p>

  <h2>5. Contacto</h2>
  <p>Para cualquier consulta relacionada con privacidad, escríbenos a: <a href="mailto:gerencia@festquest.app">gerencia@festquest.app</a></p>

  <h2>6. Cambios a esta política</h2>
  <p>Podemos actualizar esta política ocasionalmente. La fecha de última actualización siempre estará indicada al inicio del documento.</p>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor FestQuest + DishQuest Online");
});
