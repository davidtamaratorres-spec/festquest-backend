const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");

db.all(
  "SELECT sql FROM sqlite_master WHERE type='table' AND name='holidays';",
  [],
  (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(rows[0]?.sql || "No se encontró la tabla holidays");
    db.close();
  }
);
