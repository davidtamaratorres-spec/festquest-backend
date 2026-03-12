const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck
app.get("/", (req, res) => {
  res.send("Servidor FestQuest Activo");
});

// Rutas con el prefijo /api para que el móvil las encuentre
app.use("/api/municipalities", require("./routes/municipalities"));
app.use("/api/municipios", require("./routes/municipalities"));

app.use("/api/festivals", require("./routes/festivals"));
app.use("/api/festivales", require("./routes/festivals"));

// Las demás rutas (puedes añadir /api/ si el móvil las usa así)
app.use("/api/restaurants", require("./routes/restaurants"));
app.use("/api/dishes", require("./routes/dishes"));
app.use("/api/promotions", require("./routes/promotions"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});