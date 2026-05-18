const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /dishes
router.get("/", async (req, res) => {
  try {
    const { codigo_dane, municipio, categoria, q } = req.query;

    let query = `
      SELECT
        d.id,
        d.restaurante_id,
        d.nombre,
        d.descripcion,
        d.precio,
        d.categoria,
        d.imagen_url,
        d.disponible,
        d.es_tipico,
        r.nombre AS restaurante,
        r.municipio,
        r.departamento,
        r.codigo_dane,
        r.whatsapp,
        r.maps_url
      FROM dishes d
      LEFT JOIN restaurants r
        ON r.id = d.restaurante_id
      WHERE d.disponible IS NULL
         OR d.disponible = 1
    `;

    const params = [];

    if (codigo_dane) {
      params.push(String(codigo_dane));
      query += ` AND r.codigo_dane = $${params.length}`;
    }

    if (municipio) {
      params.push(`%${municipio}%`);
      query += ` AND r.municipio ILIKE $${params.length}`;
    }

    if (categoria) {
      params.push(`%${categoria}%`);
      query += ` AND d.categoria ILIKE $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      query += `
        AND (
          d.nombre ILIKE $${params.length}
          OR d.descripcion ILIKE $${params.length}
        )
      `;
    }

    query += ` ORDER BY d.nombre ASC`;

    const result = await db.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error("Error listando platos:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /dishes/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await db.query(
      `
      SELECT
        d.*,
        r.nombre AS restaurante,
        r.municipio,
        r.departamento,
        r.codigo_dane,
        r.whatsapp,
        r.maps_url
      FROM dishes d
      LEFT JOIN restaurants r
        ON r.id = d.restaurante_id
      WHERE d.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Plato no encontrado",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error consultando plato:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /dishes
router.post("/", async (req, res) => {
  try {
    const {
      restaurante_id,
      nombre,
      descripcion,
      precio,
      categoria,
      imagen_url,
      disponible,
      es_tipico,
    } = req.body;

    if (!restaurante_id || !nombre) {
      return res.status(400).json({
        error: "restaurante_id y nombre son obligatorios",
      });
    }

    const restaurant = await db.query(
      `
      SELECT id
      FROM restaurants
      WHERE id = $1
      LIMIT 1
      `,
      [restaurante_id]
    );

    if (restaurant.rows.length === 0) {
      return res.status(404).json({
        error: "Restaurante no encontrado",
      });
    }

    const result = await db.query(
      `
      INSERT INTO dishes (
        restaurante_id,
        nombre,
        descripcion,
        precio,
        categoria,
        imagen_url,
        disponible,
        es_tipico
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
      `,
      [
        restaurante_id,
        nombre,
        descripcion || "",
        precio || 0,
        categoria || "",
        imagen_url || "",
        disponible !== false,
        es_tipico === true,
      ]
    );

    res.status(201).json({
      ok: true,
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("Error creando plato:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;