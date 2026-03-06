const express = require('express');
const router = express.Router();
// IMPORTANTE: Un solo punto fuera para buscar db.js en la raíz
const db = require('../db'); 

router.get('/colombia-counts', async (req, res) => {
  try {
    const mun = await db.query("SELECT COUNT(*) FROM municipalities");
    const fest = await db.query("SELECT COUNT(*) FROM festivals");

    res.json({
      municipios: mun.rows[0].count,
      festivales: fest.rows[0].count,
      status: "Conectado a PostgreSQL en Render"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;