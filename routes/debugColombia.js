// rutas/debugColombia.js
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/colombia-counts", (req, res) => {
  const out = {
    ok: true,
    dbMode: db.mode || "unknown",
    hasDbUrl: !!process.env.DATABASE_URL,
    counts: {
      municipios: null,
      festivales: null,
      holidays: null,
    },
  };

  db.get("SELECT COUNT(*) AS c FROM municipalities;", [], (e1, r1) => {
    if (e1) return res.status(500).json({ ok: false, error: e1.message });
    out.counts.municipios = r1?.c ?? 0;

    db.get("SELECT COUNT(*) AS c FROM festivals;", [], (e2, r2) => {
      if (e2) return res.status(500).json({ ok: false, error: e2.message });
      out.counts.festivales = r2?.c ?? 0;

      db.get("SELECT COUNT(*) AS c FROM holidays;", [], (e3, r3) => {
        if (e3) return res.status(500).json({ ok: false, error: e3.message });
        out.counts.holidays = r3?.c ?? 0;

        return res.json(out);
      });
    });
  });
});

module.exports = router;
