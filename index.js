const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db"); // Busca db.js en la misma carpeta

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de bienvenida para probar que el servidor "vive"
app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "Backend de FestQuest Operativo en Raíz" });
});

// Carga de rutas desde la carpeta /routes
app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});