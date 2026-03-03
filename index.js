// index.js
const express = require("express");
const cors = require("cors");

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// Healthcheck
// =========================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    status: "FestQuest backend activo",
    dbMode: db.mode || "unknown",
    hasDbUrl: !!process.env.DATABASE_URL,
  });
});

// =========================
// API routes (NOMBRES REALES)
// =========================
app.use("/restaurants", require("./rutas/restaurants"));
app.use("/dishes", require("./rutas/dishes"));
app.use("/promotions", require("./rutas/promotions"));
app.use("/analytics", require("./rutas/analytics"));

app.use("/municipalities", require("./rutas/municipalities"));
app.use("/festivals", require("./rutas/festivals"));

// Debug
app.use("/__debug", require("./rutas/debugColombia"));

// =========================
// Start
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB mode: ${db.mode || "unknown"}`);
});