// src/index.js - Versión Completa y Corregida
const express = require("express");
const cors = require("cors");
const path = require("path");

// Subimos un nivel para encontrar db.js en la raíz del proyecto
// Esto soluciona el error "Cannot find module './db'" de tu captura 98
const db = require("../db"); 

const app = express();
app.use(cors());
app.use(express.json());

// Definimos la carpeta 'routes' subiendo un nivel desde 'src'
// Usamos el nombre real en inglés que aparece en tu VS Code (Screenshot 91)
const routesDir = path.join(__dirname, "..", "routes");

// =========================
// Ruta de Bienvenida (Prueba)
// =========================
app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    status: "Motor FestQuest Encendido",
    mensaje: "Backend funcionando correctamente en Render"
  });
});

// =========================
// Rutas de la Aplicación
// =========================
// Usamos los nombres de archivos en inglés de tu carpeta 'routes'
app.use("/restaurantes", require(path.join(routesDir, "restaurants.js")));
app.use("/platos", require(path.join(routesDir, "dishes.js")));
app.use("/municipios", require(path.join(routesDir, "municipalities.js")));
app.use("/festivales", require(path.join(routesDir, "festivals.js")));
app.use("/analytics", require(path.join(routesDir, "analytics.js")));
app.use("/promociones", require(path.join(routesDir, "promotions.js")));

// Ruta de depuración (Debug)
app.use("/__debug", require(path.join(routesDir, "debugColombia.js")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log("Estructura de rutas cargada correctamente");
});

// Intento de conexión final para estabilizar Render.