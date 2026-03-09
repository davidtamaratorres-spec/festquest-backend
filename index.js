const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// DEBUG DE ARRANQUE
const routesDir = path.join(__dirname, "routes");
console.log("=== DEBUG BACKEND ROOT ===");
console.log("cwd:", process.cwd());
console.log("__dirname:", __dirname);
console.log("routesDir:", routesDir);
console.log("exists routesDir:", fs.existsSync(routesDir));
if (fs.existsSync(routesDir)) {
  console.log("files in routes:", fs.readdirSync(routesDir));
}
console.log("==========================");

// Healthcheck
app.get("/", (req, res) => {
  res.send("Servidor FestQuest Activo");
});

// Rutas reales
app.use("/restaurants", require("./routes/restaurants"));
app.use("/restaurantes", require("./routes/restaurants"));

app.use("/dishes", require("./routes/dishes"));
app.use("/platos", require("./routes/dishes"));

app.use("/promotions", require("./routes/promotions"));
app.use("/promociones", require("./routes/promotions"));

app.use("/analytics", require("./routes/analytics"));

app.use("/municipalities", require("./routes/municipalities"));
app.use("/municipios", require("./routes/municipalities"));

app.use("/festivals", require("./routes/festivals"));
app.use("/festivales", require("./routes/festivals"));

app.use("/__debug", require("./routes/debugColombia"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Modo DB: ${db.mode || "unknown"}`);
});