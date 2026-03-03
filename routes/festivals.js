const express = require("express");
const router = express.Router();
const db = require("../db");

// --- Helpers ---
function isISODate(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function normalizeBool1(v) {
  return v === "1" || v === 1 || v === true || v === "true";
}
function clampInt(value, fallback, { min, max }) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Placeholders compatibles PG/SQLite
function makeParamHelpers(params) {
  const isPg = db?.mode === "postgres";
  return {
    isPg,
    add: (value) => {
      params.push(value);
      return isPg ? `$${params.length}` : `?`;
    },
  };
}

// ✅ LISTADO: GET /festivals (y /api/v1/festivals)
router.get("/", (req, res) => {
  const {
    from,
    to,
    departamento,
    municipioId,
    onlyHolidays,
    sortBy = "fecha_inicio",
    sortDir = "asc",
    page = 1,
    pageSize = 20,
  } = req.query;

  const hasFrom = from !== undefined && from !== null && String(from).trim() !== "";
  const hasTo = to !== undefined && to !== null && String(to).trim() !== "";

  if (hasFrom !== hasTo) {
    return res.status(400).json({
      error: "Debes enviar ambos parámetros: from y to (YYYY-MM-DD).",
    });
  }

  if (hasFrom && hasTo) {
    if (!isISODate(from) || !isISODate(to)) {
      return res.status(400).json({
        error: "Formato de fecha inválido. Usa YYYY-MM-DD en from y to.",
      });
    }
    if (from > to) {
      return res.status(400).json({
        error: "Rango inválido: from no puede ser mayor que to.",
      });
    }
  }

  const safePage = clampInt(page, 1, { min: 1, max: 1_000_000 });
  const safePageSize = clampInt(pageSize, 20, { min: 1, max: 100 });
  const limit = safePageSize;
  const offset = (safePage - 1) * limit;

  const sortByMap = {
    fecha_inicio: "f.fecha_inicio",
    fecha_fin: "f.fecha_fin",
    nombre: "f.nombre",
    municipio: "m.nombre",
    departamento: "m.departamento",
    id: "f.id",
  };

  const safeSortBy = sortByMap[sortBy] ? sortBy : "fecha_inicio";
  const safeSortDir = String(sortDir).toLowerCase() === "desc" ? "DESC" : "ASC";
  const orderClause = ` ORDER BY ${sortByMap[safeSortBy]} ${safeSortDir}, f.id ${safeSortDir}`;

  const conditions = [];
  const params = [];
  const { add } = makeParamHelpers(params);

  // Intersección de rangos (real)
  if (hasFrom && hasTo) {
    const pFrom1 = add(from);
    const pTo1 = add(to);
    conditions.push(`(COALESCE(f.fecha_fin, f.fecha_inicio) >= ${pFrom1})`);
    conditions.push(`(f.fecha_inicio <= ${pTo1})`);
  }

  if (departamento) {
    const pDepto = add(departamento);
    conditions.push(`m.departamento = ${pDepto}`);
  }

  if (municipioId) {
    const pMid = add(Number(municipioId));
    conditions.push(`f.municipio_id = ${pMid}`);
  }

  const onlyH = normalizeBool1(onlyHolidays);
  if (onlyH) {
    let existsSql = `
      EXISTS (
        SELECT 1
        FROM holidays h
        WHERE h.fecha BETWEEN f.fecha_inicio AND COALESCE(f.fecha_fin, f.fecha_inicio)
    `;

    if (hasFrom && hasTo) {
      const pFrom2 = add(from);
      const pTo2 = add(to);
      existsSql += ` AND h.fecha BETWEEN ${pFrom2} AND ${pTo2} `;
    }

    existsSql += `)`;
    conditions.push(existsSql);
  }

  const whereClause = conditions.length ? " WHERE " + conditions.join(" AND ") : "";

  const baseFrom = `
    FROM festivals f
    JOIN municipalities m ON f.municipio_id = m.id
    ${whereClause}
  `;

  const countSql = `SELECT COUNT(*) as total ${baseFrom}`;
  const countParams = [...params];

  db.get(countSql, countParams, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = Number(countRow?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const pLimit = add(limit);
    const pOffset = add(offset);

    const dataSql = `
      SELECT
        f.*,
        m.nombre as municipio_nombre,
        m.departamento
      ${baseFrom}
      ${orderClause}
      LIMIT ${pLimit} OFFSET ${pOffset}
    `;

    db.all(dataSql, params, (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({
        data: rows,
        meta: {
          page: safePage,
          pageSize: limit,
          total,
          totalPages,
          sortBy: safeSortBy,
          sortDir: safeSortDir.toLowerCase(),
          filters: {
            from: hasFrom ? from : null,
            to: hasTo ? to : null,
            departamento: departamento || null,
            municipioId: municipioId ? Number(municipioId) : null,
            onlyHolidays: onlyH,
          },
        },
      });
    });
  });
});

// ✅ DETALLE: GET /festivals/:id (y /api/v1/festivals/:id)
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  const params = [];
  const { add } = makeParamHelpers(params);
  const pId = add(id);

  const sql = `
    SELECT
      f.*,
      m.nombre as municipio_nombre,
      m.departamento
    FROM festivals f
    JOIN municipalities m ON f.municipio_id = m.id
    WHERE f.id = ${pId}
    LIMIT 1
  `;

  db.get(sql, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Festival no encontrado" });

    res.json({ data: row });
  });
});

module.exports = router;