// src/index.js
const express = require("express");
const cors = require("cors");

const db = require("../db");

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
// Rutas (carpeta real: /rutas en la raíz)
// OJO: desde /src hay que subir un nivel => ../rutas
// =========================
app.use("/restaurantes", require("../rutas/restaurantes"));
app.use("/platos", require("../rutas/platos"));
app.use("/promociones", require("../rutas/promociones"));
app.use("/analytics", require("../rutas/analytics"));

app.use("/municipios", require("../rutas/municipios"));
app.use("/festivales", require("../rutas/festivales"));

// =========================
// Debug
// =========================
app.use("/__debug", require("../rutas/debugColombia"));

// =========================
// Start server
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Modo DB: ${db.mode || "unknown"}`);
});