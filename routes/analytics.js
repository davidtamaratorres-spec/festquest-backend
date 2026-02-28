const express = require("express");
const router = express.Router();
const db = require("../db");

// ===============================
// POST /analytics/event
// ===============================
router.post("/event", (req, res) => {
  const { dishId, restaurantId, event, source } = req.body;

  if (!dishId || !event) {
    return res.status(400).json({ error: "dishId y event son requeridos" });
  }

  db.run(
    `
    INSERT INTO analytics_events (dish_id, restaurant_id, event, source)
    VALUES (?, ?, ?, ?)
    `,
    [dishId, restaurantId || null, event, source || "unknown"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// ===============================
// GET /analytics/dish/:id
// ===============================
router.get("/dish/:id", (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT event, COUNT(*) as total
    FROM analytics_events
    WHERE dish_id = ?
    GROUP BY event
    `,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const visitas =
        rows.find((r) => r.event === "view_dish")?.total || 0;
      const reservas =
        rows.find((r) => r.event === "click_reserve")?.total || 0;

      const conversion =
        visitas > 0 ? Math.round((reservas / visitas) * 100) : 0;

      res.json({
        dishId: id,
        visitas,
        reservas,
        conversión: conversion,
      });
    }
  );
});

// ===============================
// ✅ GET /analytics/restaurant/:id
// DASHBOARD RESTAURANTE
// ===============================
router.get("/restaurant/:id", (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT dish_id, event, COUNT(*) as total
    FROM analytics_events
    WHERE restaurant_id = ?
    GROUP BY dish_id, event
    `,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const platos = {};
      let totalVisitas = 0;
      let totalReservas = 0;

      rows.forEach((r) => {
        if (!platos[r.dish_id]) {
          platos[r.dish_id] = { visitas: 0, reservas: 0 };
        }

        if (r.event === "view_dish") {
          platos[r.dish_id].visitas = r.total;
          totalVisitas += r.total;
        }

        if (r.event === "click_reserve") {
          platos[r.dish_id].reservas = r.total;
          totalReservas += r.total;
        }
      });

      const conversion =
        totalVisitas > 0
          ? Math.round((totalReservas / totalVisitas) * 100)
          : 0;

      res.json({
        restaurantId: id,
        totalVisitas,
        totalReservas,
        conversión: conversion,
        platos,
      });
    }
  );
});

module.exports = router;





