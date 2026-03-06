const express = require('express');
const router = express.Router();
const db = require('../db'); // <--- Verifica que esta ruta al archivo db sea correcta

router.get('/colombia-counts', async (req, res) => {
  try {
    // Probamos con ambos nombres por si acaso
    const mun = await db.query("SELECT COUNT(*) FROM municipalities"); 
    const fest = await db.query("SELECT COUNT(*) FROM festivals");
    
    res.json({
      municipios: mun.rows[0].count,
      festivales: fest.rows[0].count,
      status: "Conexión exitosa"
    });
  } catch (err) {
    // Esto nos dirá el error exacto en la pantalla en lugar de solo "Error Interno"
    res.status(500).json({ error: err.message, detalle: "Revisa los nombres de las tablas" });
  }
});

module.exports = router;