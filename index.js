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

// Rutas reales (carpeta routes al lado de index.js)
app.use("/restaurants", require("./routes/restaurants"));
app.use("/restaurantes", require("./routes/restaurants"));

app.use("/dishes", require("./routes/dishes"));
app.use("/platos", require("./routes/dishes"));

app.use("/promotions", require("./routes/promotions"));
app.use("/promociones", require("./routes/promotions"));

app.use("/analytics", require("./routes/analytics"));

app.use("/municipalities", require("./routes/municipalities"));
app.use("/municipios", require("./routes/municipalities"));

app.use("/festivals", require("./routes/festivals"));
app.use("/festivales", require("./routes/festivals"));

app.use("/__debug", require("./routes/debugColombia"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Modo DB: ${db.mode || "unknown"}`);
});