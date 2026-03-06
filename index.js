const express = require("express");
const cors = require("cors");
const path = require("path");
// CAMBIO CLAVE: Usamos ./ porque db.js está en la misma carpeta raíz
const db = require("./db"); 

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de bienvenida para probar que el servidor "vive"
app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: "Backend de FestQuest Operativo en Raíz",
    estado: "Plan Pro Activo" 
  });
});

// Carga de rutas desde la carpeta /routes (están al mismo nivel)
app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

// Render asigna el puerto automáticamente, por eso usamos process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log("Conexión a base de datos preparada.");
});