const express = require("express");
const router = express.Router();
const db = require("../db");

// Normaliza: minúsculas + sin tildes + sin espacios dobles
function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function clampInt(value, fallback, { min, max }) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function splitPipe(value) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * GET /api/municipalities
 */
router.get("/", async (req, res) => {
  try {
    const { departamento, q, page = 1, pageSize = 20 } = req.query;

    const safePage = clampInt(page, 1, { min: 1, max: 1_000_000 });
    const safePageSize = clampInt(pageSize, 20, { min: 1, max: 100 });
    const limit = safePageSize;
    const offset = (safePage - 1) * limit;

    const hasQ = q !== undefined && q !== null && String(q).trim() !== "";
    const qNorm = hasQ ? norm(q) : null;

    let sql = "SELECT * FROM municipalities";
    const params = [];

    if (departamento) {
      sql += " WHERE departamento = $1";
      params.push(departamento);
    }

    sql += " ORDER BY nombre ASC, id ASC";

    const result = await db.query(sql, params);
    let rows = result.rows;

    let filtered = rows;

    if (hasQ) {
      filtered = rows.filter((r) => {
        const nNombre = norm(r.nombre);
        const nSub = norm(r.subregion);
        return nNombre.includes(qNorm) || nSub.includes(qNorm);
      });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pageRows = filtered.slice(offset, offset + limit);

    res.json({
      data: pageRows,
      meta: {
        page: safePage,
        pageSize: limit,
        total,
        totalPages,
        signature: "FestQuest municipalities.js v4 (detail payload fixed)",
        filters: {
          departamento: departamento || null,
          q: hasQ ? String(q) : null,
        },
      },
    });
  } catch (err) {
    console.error("Error en listado:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/municipalities/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const sql = `
      SELECT
        m.*,
        (SELECT COUNT(*) FROM festivals f WHERE f.municipio_id = m.id) as "festivalsCount"
      FROM municipalities m
      WHERE m.id = $1
    `;

    const result = await db.query(sql, [id]);
    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: "Municipio no encontrado" });
    }

    const placesNames = splitPipe(row.sitios_turisticos);
    const hotelsNames = splitPipe(row.hoteles);
    const contacts = splitPipe(row.contacto_hoteles);

    const places = placesNames.map((nombre, i) => ({
      nombre,
      maps_link: contacts[i] || null,
    }));

    const hotels = hotelsNames.map((nombre, i) => ({
      nombre,
      whatsapp_link: contacts[i] || null,
    }));

    res.json({
      municipio: row,
      places,
      hotels,
    });
  } catch (err) {
    console.error("Error en detalle:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;