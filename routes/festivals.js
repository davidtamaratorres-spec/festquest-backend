const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /festivals
router.get("/", (req, res) => {
  const sql = `
    SELECT
      f.id,
      f.nombre,
      f.fecha_inicio,
      f.fecha_fin,
      f.descripcion,
      f.municipio_id,
      m.nombre AS municipio_nombre,
      m.departamento
    FROM festivals f
    LEFT JOIN municipalities m ON m.id = f.municipio_id
    ORDER BY f.fecha_inicio ASC, f.id ASC
    LIMIT 20
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error en GET /festivals:", err.message);
      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }

    return res.json({
      ok: true,
      count: rows.length,
      data: rows,
    });
  });
});

// GET /festivals/:id
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      ok: false,
      error: "ID inválido",
    });
  }

  const sql = `
    SELECT
      f.id,
      f.nombre,
      f.fecha_inicio,
      f.fecha_fin,
      f.descripcion,
      f.municipio_id,
      m.nombre AS municipio_nombre,
      m.departamento
    FROM festivals f
    LEFT JOIN municipalities m ON m.id = f.municipio_id
    WHERE f.id = ?
    LIMIT 1
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error("❌ Error en GET /festivals/:id:", err.message);
      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }

    if (!row) {
      return res.status(404).json({
        ok: false,
        error: "Festival no encontrado",
      });
    }

    return res.json({
      ok: true,
      data: row,
    });
  });
});

module.exports = router;