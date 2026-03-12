const express = require("express");
const router = express.Router();
const db = require("../db");

// LISTADO (Este ya te funciona bien)
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

// DETALLE (Aquí estaba el error "id does not exist")
router.get("/:id_festival", async (req, res) => {
  try {
    const { id_festival } = req.params;
    // IMPORTANTE: Asegúrate de usar el nombre correcto de la columna (id)
    const result = await db.query("SELECT * FROM festivals WHERE id = $1", [id_festival]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Festival no encontrado" });
    }

    // Enviamos el objeto directo para que el celular no se confunda con el JSON
    res.json(result.rows[0]); 
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;