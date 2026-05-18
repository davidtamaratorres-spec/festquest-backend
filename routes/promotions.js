const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /promotions
router.get("/", async (req, res) => {
  try {
    const { restaurant_id, festival_id, codigo_dane } = req.query;

    let query = `
      SELECT
        p.*,
        r.nombre AS restaurante,
        f.nombre AS festival
      FROM promotions p
      LEFT JOIN restaurants r ON r.id = p.restaurante_id
      LEFT JOIN festivals f ON f.id = p.festival_id
      WHERE p.activo IS NULL
          OR p.activo = 1

    `;

    const params = [];

    if (restaurant_id) {
      params.push(Number(restaurant_id));
      query += ` AND p.restaurante_id = $${params.length}`;
    }

    if (festival_id) {
      params.push(Number(festival_id));
      query += ` AND p.festival_id = $${params.length}`;
    }

    if (codigo_dane) {
      params.push(String(codigo_dane));
      query += ` AND r.codigo_dane = $${params.length}`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error("Error listando promociones:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /promotions
router.post("/", async (req, res) => {
  try {
    const {
      restaurante_id,
      festival_id,
      tipo,
      descripcion,
      fecha_inicio,
      fecha_fin,
      activo,
    } = req.body;

    if (!restaurante_id || !tipo) {
      return res.status(400).json({
        error: "restaurante_id y tipo son obligatorios",
      });
    }

    const result = await db.query(
      `
      INSERT INTO promotions (
        restaurante_id,
        festival_id,
        tipo,
        descripcion,
        fecha_inicio,
        fecha_fin,
        activo
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id
      `,
      [
        restaurante_id,
        festival_id || null,
        tipo,
        descripcion || "",
        fecha_inicio || null,
        fecha_fin || null,
        activo !== false,
      ]
    );

    res.status(201).json({
      ok: true,
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("Error creando promoción:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;