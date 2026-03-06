const express = require("express");
const cors = require("cors");
const path = require("path");

// REGLA DE ORO: Un solo punto (.) porque db.js está en la misma carpeta raíz
// Esto corrige el error de la Screenshot_137
const db = require("./db"); 

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de bienvenida
app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: "Backend de FestQuest Operativo en Raíz",
    estado: "Plan Pro Activo" 
  });
});

// Carga de rutas desde la carpeta /routes
// Render es sensible a mayúsculas: debugColombia.js tiene C mayúscula
app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

// Render asigna el puerto automáticamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log("Rutas cargadas correctamente desde la raíz.");
});
// Verificación final v2