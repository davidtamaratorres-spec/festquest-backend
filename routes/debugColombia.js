const express = require('express');
const router = express.Router();
const path = require('path');
// Esta línea es la que arregla el error de "Cannot find module"
const db = require(path.join(__dirname, '../db')); 

router.get('/colombia-counts', async (req, res) => {
  try {
    // Usamos db.query (que es la función correcta según el log anterior)
    const mun = await db.query("SELECT COUNT(*) FROM municipalities");
    const fest = await db.query("SELECT COUNT(*) FROM festivals");

    res.json({
      municipios: mun.rows[0].count,
      festivales: fest.rows[0].count,
      status: "¡Conexión Exitosa con Render Pro!"
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: "Revisa la conexión a DB" });
  }
});

module.exports = router;