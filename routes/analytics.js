const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /analytics/event
router.post("/event", async (req, res) => {
  try {
    const { dishId, restaurantId, festivalId, event, source, codigo_dane } = req.body;

    if (!event) {
      return res.status(400).json({ error: "event es requerido" });
    }

    const result = await db.query(
      `
      INSERT INTO analytics_events (
        dish_id,
        restaurant_id,
        festival_id,
        event,
        source,
        codigo_dane
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
      `,
      [
        dishId || null,
        restaurantId || null,
        festivalId || null,
        event,
        source || "unknown",
        codigo_dane || null,
      ]
    );

    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error registrando evento:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /analytics/demand
router.post("/demand", async (req, res) => {
  try {
    const { query, municipio, departamento, codigo_dane, source } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "query es requerido" });
    }

    const result = await db.query(
      `
      INSERT INTO demand_logs (
        query,
        municipio,
        departamento,
        codigo_dane,
        source
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
      [
        query.trim().toLowerCase(),
        municipio || null,
        departamento || null,
        codigo_dane || null,
        source || "mobile",
      ]
    );

    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error registrando demanda:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/demand
router.get("/demand", async (req, res) => {
  try {
    const { codigo_dane, municipio } = req.query;

    let query = `
      SELECT
        query,
        municipio,
        departamento,
        codigo_dane,
        COUNT(*)::int AS count
      FROM demand_logs
      WHERE 1 = 1
    `;

    const params = [];

    if (codigo_dane) {
      params.push(String(codigo_dane));
      query += ` AND codigo_dane = $${params.length}`;
    }

    if (municipio) {
      params.push(`%${municipio}%`);
      query += ` AND municipio ILIKE $${params.length}`;
    }

    query += `
      GROUP BY query, municipio, departamento, codigo_dane
      ORDER BY count DESC
      LIMIT 100
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error consultando demanda:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/dish/:id
router.get("/dish/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await db.query(
      `
      SELECT event, COUNT(*)::int AS total
      FROM analytics_events
      WHERE dish_id = $1
      GROUP BY event
      `,
      [id]
    );

    const rows = result.rows;

    const visitas = rows.find((r) => r.event === "view_dish")?.total || 0;
    const reservas = rows.find((r) => r.event === "click_reserve")?.total || 0;
    const conversion = visitas > 0 ? Math.round((reservas / visitas) * 100) : 0;

    res.json({
      dishId: id,
      visitas,
      reservas,
      conversion,
    });
  } catch (err) {
    console.error("Error consultando analytics plato:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /analytics/restaurant/:id
router.get("/restaurant/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await db.query(
      `
      SELECT dish_id, event, COUNT(*)::int AS total
      FROM analytics_events
      WHERE restaurant_id = $1
      GROUP BY dish_id, event
      `,
      [id]
    );

    const platos = {};
    let totalVisitas = 0;
    let totalReservas = 0;

    result.rows.forEach((r) => {
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
      totalVisitas > 0 ? Math.round((totalReservas / totalVisitas) * 100) : 0;

    res.json({
      restaurantId: id,
      totalVisitas,
      totalReservas,
      conversion,
      platos,
    });
  } catch (err) {
    console.error("Error consultando analytics restaurante:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;