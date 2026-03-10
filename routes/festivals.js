const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    // Consulta simplificada para evitar el error 500
    // Traemos todo (*) para que no falle por nombres de columnas
    const query = `
      SELECT * FROM festivals 
      ORDER BY id ASC 
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [pageSize, offset]);

    res.json({
      success: true,
      page: page,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error("ERROR festivals:", err);
    // Esto nos dirá exactamente qué columna falta en los logs de Render
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;