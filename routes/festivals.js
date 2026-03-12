const express = require("express");
const router = express.Router();
const db = require("../db");

// LISTADO GENERAL (URL: /api/festivals)
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

    // CORRECCIÓN AQUÍ: Ponemos los números directos en LIMIT y OFFSET 
    // para evitar el error de sintaxis que viste en Render
    query += ` ORDER BY nombre ASC LIMIT ${pageSize} OFFSET ${offset}`;

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      page: page,
      data: result.rows
    });
  } catch (err) {
    // Esto te ayudará a ver el error real en los logs de Render
    console.error("Error en SQL:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DETALLE DE UN FESTIVAL (URL: /api/festivals/:id)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM festivals WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Festival no encontrado" });
    }

    res.json(result.rows[0]); 
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;