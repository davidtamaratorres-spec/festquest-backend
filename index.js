// index.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Diagnóstico duro (se imprime al arrancar en Render)
function safeList(dir) {
  try {
    return fs.readdirSync(dir);
  } catch (e) {
    return { error: e.message };
  }
}

console.log("=== FESTQUEST BOOT DIAG ===");
console.log("cwd:", process.cwd());
console.log("__dirname:", __dirname);
console.log("has ./index.js:", fs.existsSync(path.join(process.cwd(), "index.js")));
console.log("has ./rutas:", fs.existsSync(path.join(process.cwd(), "rutas")));
console.log("has ./routes:", fs.existsSync(path.join(process.cwd(), "routes")));
console.log("list ./ :", safeList(process.cwd()));
console.log("list ./rutas :", safeList(path.join(process.cwd(), "rutas")));
console.log("list ./routes:", safeList(path.join(process.cwd(), "routes")));
console.log("=== END DIAG ===");

// Healthcheck
app.get("/", (req, res) => {
  res.json({
    ok: true,
    status: "FestQuest backend activo",
    dbMode: db.mode || "unknown",
    hasDbUrl: !!process.env.DATABASE_URL,
  });
});

// Rutas (lo dejamos igual a tu versión)
app.use("/restaurantes", require("./rutas/restaurantes"));
app.use("/platos", require("./rutas/platos"));
app.use("/promociones", require("./rutas/promociones"));
app.use("/analytics", require("./rutas/analytics"));

app.use("/municipios", require("./rutas/municipios"));
app.use("/festivales", require("./rutas/festivales"));

// Debug
app.use("/__debug", require("./rutas/debugColombia"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Modo DB: ${db.mode || "unknown"}`);
});