// src/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const db = require("../db");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// Diagnóstico de archivos (ANTES de require)
// =========================
const rutasDir = path.join(__dirname, "..", "rutas"); // /project/src/rutas
const restaurantesFile = path.join(rutasDir, "restaurantes.js");

console.log("=== DEBUG PATHS ===");
console.log("cwd:", process.cwd());
console.log("__dirname:", __dirname);
console.log("rutasDir:", rutasDir);
console.log("exists rutasDir:", fs.existsSync(rutasDir));
if (fs.existsSync(rutasDir)) {
  try {
    console.log("rutasDir files:", fs.readdirSync(rutasDir));
  } catch (e) {
    console.log("ERROR reading rutasDir:", e.message);
  }
}
console.log("restaurantesFile:", restaurantesFile);
console.log("exists restaurantes.js:", fs.existsSync(restaurantesFile));
console.log("===================");

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
// Rutas (con require ABSOLUTO al archivo .js)
// =========================
app.use("/restaurantes", require(restaurantesFile));
app.use("/platos", require(path.join(rutasDir, "platos.js")));
app.use("/promociones", require(path.join(rutasDir, "promociones.js")));
app.use("/analytics", require(path.join(rutasDir, "analytics.js")));

app.use("/municipios", require(path.join(rutasDir, "municipios.js")));
app.use("/festivales", require(path.join(rutasDir, "festivales.js")));

// Debug
app.use("/__debug", require(path.join(rutasDir, "debugColombia.js")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Modo DB: ${db.mode || "unknown"}`);
});