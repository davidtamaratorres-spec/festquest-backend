// index.js
const express = require("express");
const cors = require("cors");

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// Healthcheck
// =========================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    status: "FestQuest backend activo",
    dbMode: db.mode || "unknown",
    hasDbUrl: !!process.env.DATABASE_URL,
  });
});

// =========================
// API routes (CARPETA REAL = routes)
// =========================
app.use("/restaurantes", require("./routes/restaurantes"));
app.use("/platos", require("./routes/platos"));
app.use("/promociones", require("./routes/promociones"));
app.use("/analytics", require("./routes/analytics"));

app.use("/municipios", require("./routes/municipios"));
app.use("/festivales", require("./routes/festivales"));

// Debug
app.use("/__debug", require("./routes/debugColombia"));

// =========================
// Start
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`DB mode: ${db.mode || "unknown"}`);
});