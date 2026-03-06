const express = require("express");
const cors = require("cors");
const path = require("path");

// REGLA DE ORO: Un solo punto (.) porque db.js está en la misma carpeta raíz
const db = require("./db"); 

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de bienvenida para verificar que el servidor arrancó
app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: "Backend de FestQuest Operativo en Raíz",
    info: "Conectado exitosamente a PostgreSQL" 
  });
});

// Carga de rutas desde la carpeta /routes
// Render es sensible a mayúsculas, asegúrate que los nombres coincidan con Screenshot_134
app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

// Render asigna el puerto mediante la variable de entorno PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log("Rutas cargadas: /__debug, /festivales, /municipios");
});