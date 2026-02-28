const express = require("express");
const router = express.Router();
const db = require("../db");

// Listar restaurantes
router.get("/", (req, res) => {
  db.all("SELECT * FROM restaurants WHERE activo = 1", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Detalle restaurante
router.get("/:id", (req, res) => {
  db.get(
    "SELECT * FROM restaurants WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

module.exports = router;
