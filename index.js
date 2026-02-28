// index.js (FiestaRuta Backend)
// PASO 5: rutas municipalities y festivals

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Rutas FiestaRuta (compatibilidad)
app.use("/municipalities", require("./routes/municipalities"));
app.use("/festivals", require("./routes/festivals"));

// Alias API v1 (sin romper rutas actuales)
app.use("/api/v1/municipalities", require("./routes/municipalities"));
app.use("/api/v1/festivals", require("./routes/festivals"));

// Diagnóstico temporal
app.get("/__debug/db", (req, res) => {
  const dbPath = path.join(__dirname, "database.sqlite");
  const exists = fs.existsSync(dbPath);

  db.get("SELECT 1 as ok", (err, r1) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      app: "FiestaRuta",
      puerto: process.env.PORT || 3002,
      dbPath,
      exists,
      fileSizeBytes: exists ? fs.statSync(dbPath).size : 0,
      dbTest: r1,
    });
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`✅ FiestaRuta backend running on port ${PORT}`));
