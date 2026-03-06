const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/colombia-counts', async (req, res) => {
  try {
    // Usamos .query() que es lo que PostgreSQL entiende
    const mun = await db.query("SELECT COUNT(*) FROM municipalities");
    const fest = await db.query("SELECT COUNT(*) FROM festivals");

    res.json({
      municipios: mun.rows[0].count,
      festivales: fest.rows[0].count,
      mensaje: "¡Conexión exitosa desde Render Pro!"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;