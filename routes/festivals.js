const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /festivals
router.get("/", async (req, res) => {
  const { municipio_id, departamento } = req.query;

  try {
    let query = `
      SELECT
        f.id,
        f.nombre,
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

    if (departamento) {
      params.push(departamento);
      const p = params.length;
      conditions.push(`m.departamento ILIKE $${p}`);
    }

    if (conditions.length > 0) {
      query += ` AND ` + conditions.join(" AND ");
    }

    query += ` ORDER BY m.departamento ASC, m.nombre ASC, f.id ASC`;

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

// GET /festivals/:id
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