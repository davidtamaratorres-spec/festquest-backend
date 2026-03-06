const express = require("express");
const cors = require("cors");
const path = require("path");

// REGLA DE ORO: Un solo punto (.) porque db.js está en la misma carpeta raíz
const db = require("./db"); 

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de bienvenida confirmada
app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: "FestQuest Backend Online",
    status: "Sincronizado con Plan Pro" 
  });
});

// Carga de rutas desde la carpeta /routes
app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});