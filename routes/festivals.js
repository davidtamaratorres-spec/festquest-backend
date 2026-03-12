const express = require("express");
const router = express.Router();
const db = require("../db");

// 1. RUTA PARA LA LISTA (Con filtros y paginación)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const depto = req.query.departamento || ""; 
    const offset = (page - 1) * pageSize;

    let query = "SELECT * FROM festivals";
    let params = [];

    if (depto) {
      query += " WHERE departamento ILIKE $1";
      params.push(`%${depto}%`);
    }

    query += ` ORDER BY nombre ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pageSize, offset);

    const result = await db.query(query, params);
    res.json({ success: true, page: page, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. RUTA PARA EL DETALLE (Esto es lo que arregla el error del móvil)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM festivals WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No encontrado" });
    }
    res.json(result.rows[0]); 
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;