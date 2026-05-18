const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /restaurants
// Lista restaurantes activos
router.get("/", async (req, res) => {
  try {
    const { codigo_dane, municipio, departamento } = req.query;

    let query = `
      SELECT *
      FROM restaurants
      WHERE activo IS NULL
         OR activo = 1

    `;

    const params = [];

    if (codigo_dane) {
      params.push(String(codigo_dane));
      query += ` AND codigo_dane = $${params.length}`;
    }

    if (municipio) {
      params.push(`%${municipio}%`);
      query += ` AND municipio ILIKE $${params.length}`;
    }

    if (departamento) {
      params.push(`%${departamento}%`);
      query += ` AND departamento ILIKE $${params.length}`;
    }

    query += ` ORDER BY nombre ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error listando restaurantes:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /restaurants/:id
// Detalle restaurante
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await db.query(
      `
      SELECT *
      FROM restaurants
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Restaurante no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error consultando restaurante:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;