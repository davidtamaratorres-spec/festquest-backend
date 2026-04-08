const express = require("express");
const router = express.Router();
const db = require("../db");

// ===============================
// GET /festivals
// ===============================
router.get("/", async (req, res) => {
  const { municipio_id, departamento, from, to } = req.query;

  try {
    let query = `
      SELECT
        f.id,
        f.nombre,
        f.festival,
        f.fecha,
        f.descripcion,
        f.municipio_id,
        f.source_type,
        f.verified,
        f.is_active,
        f.sitios_turisticos,
        f.hoteles,
        f.contacto_hoteles,
        m.nombre AS municipio,
        m.departamento,
        m.subregion,
        m.habitantes,
        m.temperatura_promedio,
        m.altura
      FROM festivals f
      LEFT JOIN municipalities m ON f.municipio_id = m.id
      WHERE f.is_active = true
    `;

    let params = [];
    let conditions = [];

    // ===============================
    // 1. FILTRO FECHA (CORREGIDO)
    // ===============================
    if (from && to) {
      params.push(from);
      const p1 = params.length;

      params.push(to);
      const p2 = params.length;

      conditions.push(`
        CASE
          WHEN f.fecha ~ '^\\d{4}-\\d{2}-\\d{2}$'
            THEN f.fecha::date
          WHEN LOWER(f.fecha) = 'enero' THEN '2026-01-01'::date
          WHEN LOWER(f.fecha) = 'febrero' THEN '2026-02-01'::date
          WHEN LOWER(f.fecha) = 'marzo' THEN '2026-03-01'::date
          WHEN LOWER(f.fecha) = 'abril' THEN '2026-04-01'::date
          WHEN LOWER(f.fecha) = 'mayo' THEN '2026-05-01'::date
          WHEN LOWER(f.fecha) = 'junio' THEN '2026-06-01'::date
          WHEN LOWER(f.fecha) = 'julio' THEN '2026-07-01'::date
          WHEN LOWER(f.fecha) = 'agosto' THEN '2026-08-01'::date
          WHEN LOWER(f.fecha) = 'septiembre' THEN '2026-09-01'::date
          WHEN LOWER(f.fecha) = 'octubre' THEN '2026-10-01'::date
          WHEN LOWER(f.fecha) = 'noviembre' THEN '2026-11-01'::date
          WHEN LOWER(f.fecha) = 'diciembre' THEN '2026-12-01'::date
          ELSE NULL
        END BETWEEN $${p1} AND $${p2}
      `);
    }

    // ===============================
    // 2. FILTRO MUNICIPIO
    // ===============================
    if (municipio_id) {
      params.push(municipio_id);
      const p = params.length;

      conditions.push(`
        f.municipio_id = $${p}
        AND f.source_type = (
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM festivals
              WHERE municipio_id = $${p}
                AND source_type = 'real'
                AND is_active = true
            )
            THEN 'real'
            ELSE 'base'
          END
        )
      `);
    }

    // ===============================
    // 3. FILTRO DEPARTAMENTO
    // ===============================
    if (departamento) {
      params.push(departamento);
      const p = params.length;
      conditions.push(`m.departamento ILIKE $${p}`);
    }

    if (conditions.length > 0) {
      query += ` AND ` + conditions.join(" AND ");
    }

    // ===============================
    // ORDEN FINAL (CORREGIDO)
    // ===============================
    query += `
      ORDER BY
        CASE WHEN f.fecha IS NULL THEN 1 ELSE 0 END,
        CASE
          WHEN f.fecha ~ '^\\d{4}-\\d{2}-\\d{2}$'
            THEN f.fecha::date
          WHEN LOWER(f.fecha) = 'enero' THEN '2026-01-01'::date
          WHEN LOWER(f.fecha) = 'febrero' THEN '2026-02-01'::date
          WHEN LOWER(f.fecha) = 'marzo' THEN '2026-03-01'::date
          WHEN LOWER(f.fecha) = 'abril' THEN '2026-04-01'::date
          WHEN LOWER(f.fecha) = 'mayo' THEN '2026-05-01'::date
          WHEN LOWER(f.fecha) = 'junio' THEN '2026-06-01'::date
          WHEN LOWER(f.fecha) = 'julio' THEN '2026-07-01'::date
          WHEN LOWER(f.fecha) = 'agosto' THEN '2026-08-01'::date
          WHEN LOWER(f.fecha) = 'septiembre' THEN '2026-09-01'::date
          WHEN LOWER(f.fecha) = 'octubre' THEN '2026-10-01'::date
          WHEN LOWER(f.fecha) = 'noviembre' THEN '2026-11-01'::date
          WHEN LOWER(f.fecha) = 'diciembre' THEN '2026-12-01'::date
          ELSE NULL
        END ASC,
        m.departamento ASC,
        m.nombre ASC,
        f.id ASC
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error en festivals:", err.message);
    res.status(500).json({
      success: false,
      error: "Error cargando festivals",
    });
  }
});

// ===============================
// GET /festivals/:id
// ===============================
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const query = `
      SELECT
        f.id,
        f.nombre,
        f.festival,
        f.fecha,
        f.descripcion,
        f.municipio_id,
        f.source_type,
        f.verified,
        f.is_active,
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
    `;

    const result = await db.query(query, [id]);
    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({ error: "Festival no encontrado" });
    }

    res.json(row);
  } catch (err) {
    console.error("Error en festival detalle:", err.message);
    res.status(500).json({
      error: "Error cargando detalle del festival",
    });
  }
});

module.exports = router;