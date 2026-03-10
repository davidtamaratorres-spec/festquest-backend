const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, nombre, fecha_inicio, fecha_fin
      FROM festivals
      ORDER BY fecha_inicio
      LIMIT 20
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error("ERROR festivals:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;