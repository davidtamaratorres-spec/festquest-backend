console.log("Servidor iniciando...");
const express = require("express");
const cors = require("cors");
const db = require("./db"); // Ya no fallará

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, mensaje: "Backend FestQuest - ¡Base de datos conectada!" });
});

app.use("/__debug", require("./routes/debugColombia"));
app.use("/festivales", require("./routes/festivals"));
app.use("/municipios", require("./routes/municipalities"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor listo"));