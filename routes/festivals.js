const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const depto = req.query.departamento || ""; // Capturamos el filtro
    const offset = (page - 1) * pageSize;

    let query = "SELECT * FROM festivals";
    let params = [];

    // Lógica de filtrado corregida
    if (depto) {
      query += " WHERE departamento ILIKE $1";
      params.push(`%${depto}%`);
    }

    // Paginación
    query += ` ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pageSize, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      page: page,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;