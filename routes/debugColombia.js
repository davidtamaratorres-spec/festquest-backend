const express = require('express');
const router = express.Router();
const db = require('../db'); // Sube un nivel para encontrar db.js en la raíz

router.get('/colombia-counts', async (req, res) => {
  try {
    const mun = await db.query("SELECT COUNT(*) FROM municipalities");
    const fest = await db.query("SELECT COUNT(*) FROM festivals");

    res.json({
      municipios: mun.rows[0].count,
      festivales: fest.rows[0].count,
      status: "¡Sincronización Exitosa!"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;