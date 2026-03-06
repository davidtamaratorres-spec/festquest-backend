const express = require('express');
const router = express.Router();
const path = require('path');

// Esta línea usa rutas absolutas para evitar el error de la Screenshot_129
const db = require(path.join(__dirname, '../../src/db')); 

router.get('/colombia-counts', async (req, res) => {
  try {
    // Usamos db.query() para corregir el TypeError visto en la Screenshot_125
    const mun = await db.query("SELECT COUNT(*) FROM municipalities");
    const fest = await db.query("SELECT COUNT(*) FROM festivals");

    res.json({
      municipios: mun.rows[0].count,
      festivales: fest.rows[0].count,
      mensaje: "¡Conexión exitosa en Render Pro!"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;