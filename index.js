const express = require("express");
const cors = require("cors");
const path = require("path");

// 1. Conexión a la base de datos (Punto simple)
const db = require("./db"); 

const app = express();
app.use(cors());
app.use(express.json());

// 2. Ruta de prueba rápida
app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "Backend en Raíz Funcionando" });
});

// 3. Carga de rutas - ¡CUIDADO CON LAS MAYÚSCULAS!
// Verifica que en tu carpeta 'routes' el archivo se llame exactamente 'debugColombia.js'
app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});