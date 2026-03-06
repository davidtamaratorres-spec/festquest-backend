const express = require("express");
const cors = require("cors");
const path = require("path");
// IMPORTANTE: Un solo punto porque db.js está en la misma carpeta raíz
const db = require("./db"); 

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: "FestQuest Backend Online",
    status: "Plan Pro Sincronizado" 
  });
});

// Rutas (usando el nombre exacto de tus archivos en Screenshot_134)
app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});