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

/**
 * GET /api/v1/municipalities
 * Query:
 * - departamento=Antioquia
 * - q=texto libre (busca por nombre y subregion, tolerante a tildes)
 * - page, pageSize
 *
 * Respuesta (ESTÁNDAR):
 * { data: [...], meta: { page, pageSize, total, totalPages, signature } }
 */
router.get("/", (req, res) => {
  const { departamento, q, page = 1, pageSize = 20 } = req.query;

  const safePage = clampInt(page, 1, { min: 1, max: 1_000_000 });
  const safePageSize = clampInt(pageSize, 20, { min: 1, max: 100 });
  const limit = safePageSize;
  const offset = (safePage - 1) * limit;

  const hasQ = q !== undefined && q !== null && String(q).trim() !== "";
  const qNorm = hasQ ? norm(q) : null;

  // ✅ IMPORTANTE:
  // Para tolerancia real a tildes, NO usamos prefilter SQL con LIKE del texto crudo,
  // porque 'Caceres' no encuentra 'Cáceres'. Traemos por departamento y filtramos en JS.
  let sql = "SELECT * FROM municipalities";
  const params = [];

  if (departamento) {
    sql += " WHERE departamento = ?";
    params.push(departamento);
  }

  sql += " ORDER BY nombre ASC, id ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

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
        // ✅ “Firma” para identificar este archivo
        signature: "FiestaRuta municipalities.js v2 (data/meta)",
        filters: {
          departamento: departamento || null,
          q: hasQ ? String(q) : null,
        },
      },
    });
  });
});

/**
 * GET /api/v1/municipalities/:id
 * Incluye festivalsCount (cantidad de festivales en ese municipio)
 */
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  const sql = `
    SELECT
      m.*,
      (SELECT COUNT(*) FROM festivals f WHERE f.municipio_id = m.id) as festivalsCount
    FROM municipalities m
    WHERE m.id = ?
    LIMIT 1
  `;

  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Municipio no encontrado" });

    res.json({
      data: row,
      meta: {
        signature: "FiestaRuta municipalities.js v2 (data/meta)",
      },
    });
  });
});

module.exports = router;
