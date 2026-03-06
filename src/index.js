// src/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");
// En tu Screenshot_91 veo que db.js está en la misma carpeta que index.js
const db = require("../db"); 

const app = express();
app.use(cors());
app.use(express.json());

// Definimos la carpeta 'routes' subiendo un nivel desde 'src'
const routesDir = path.join(__dirname, "..", "routes");

// Ruta de prueba para saber que el motor encendió
app.get("/", (req, res) => {
  res.json({ ok: true, status: "Motor FestQuest Encendido" });
});

// Usamos los nombres REALES de tus archivos en inglés
app.use("/restaurantes", require(path.join(routesDir, "restaurants.js")));
app.use("/platos", require(path.join(routesDir, "dishes.js")));
app.use("/municipios", require(path.join(routesDir, "municipalities.js")));
app.use("/festivales", require(path.join(routesDir, "festivals.js")));
app.use("/analytics", require(path.join(routesDir, "analytics.js")));
app.use("/promociones", require(path.join(routesDir, "promotions.js")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
// Intento de conexión 1.