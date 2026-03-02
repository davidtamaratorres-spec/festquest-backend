// index.js (FestQuest Backend)

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Ruta raíz (health check)
app.get("/", (req, res) => {
  res.json({
    status: "FestQuest backend activo",
    ok: true,
  });
});

// Rutas FestQuest
app.use("/municipalities", require("./routes/municipalities"));
app.use("/festivals", require("./routes/festivals"));

// Alias API v1
app.use("/api/v1/municipalities", require("./routes/municipalities"));
app.use("/api/v1/festivals", require("./routes/festivals"));

// ✅ Diagnóstico REAL (detecta Postgres vs SQLite)
app.get("/__debug/db", (req, res) => {
  const usingPg = !!process.env.DATABASE_URL;

  db.get("SELECT 1 as ok", (err, r1) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      app: "FestQuest",
      puerto: process.env.PORT || 3002,
      mode: usingPg ? "postgres" : "sqlite",
      databaseUrlSet: usingPg,
      sqlitePath: db.SQLITE_PATH || null,
      dbTest: r1,
    });
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ FestQuest backend running on port ${PORT}`);
});
