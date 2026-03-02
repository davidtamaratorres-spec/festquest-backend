const express = require("express");
const router = express.Router();
const db = require("../db");

const isPostgres = !!db._pool;

function isISODate(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function clampInt(value, fallback, { min, max }) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20
    } = req.query;

    const safePage = clampInt(page, 1, { min: 1, max: 1_000_000 });
    const safePageSize = clampInt(pageSize, 20, { min: 1, max: 100 });
    const limit = safePageSize;
    const offset = (safePage - 1) * limit;

    if (isPostgres) {

      const countResult = await db._pool.query(
        `SELECT COUNT(*)::int as total FROM festivals`
      );

      const total = countResult.rows[0].total;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const dataResult = await db._pool.query(
        `
        SELECT f.*, m.nombre as municipio_nombre, m.departamento
        FROM festivals f
        JOIN municipalities m ON f.municipio_id = m.id
        ORDER BY f.fecha_inicio ASC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      return res.json({
        data: dataResult.rows,
        meta: {
          page: safePage,
          pageSize: limit,
          total,
          totalPages
        }
      });

    } else {

      db.get(`SELECT COUNT(*) as total FROM festivals`, [], (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countRow.total;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        db.all(
          `
          SELECT f.*, m.nombre as municipio_nombre, m.departamento
          FROM festivals f
          JOIN municipalities m ON f.municipio_id = m.id
          ORDER BY f.fecha_inicio ASC
          LIMIT ? OFFSET ?
          `,
          [limit, offset],
          (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });

            res.json({
              data: rows,
              meta: {
                page: safePage,
                pageSize: limit,
                total,
                totalPages
              }
            });
          }
        );
      });
    }

  } catch (e) {
    console.error("FESTIVALS ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;