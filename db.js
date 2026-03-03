// db.js (FestQuest / FiestaRuta)
// Objetivo: usar Postgres en Render (DATABASE_URL) y SQLite en local (fallback)
// Exporta SIEMPRE interfaz: { mode, all, get, run, ... }

const fs = require("fs");
const path = require("path");

const DATABASE_URL = process.env.DATABASE_URL;

// =========================
// POSTGRES (Render / Prod)
// =========================
if (DATABASE_URL) {
  const { Pool } = require("pg");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log("✅ PostgreSQL mode (DATABASE_URL detectado)");

  async function pgMigrate() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS municipalities (
          id SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL,
          departamento TEXT NOT NULL,
          descripcion TEXT DEFAULT ''
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS festivals (
          id SERIAL PRIMARY KEY,
          municipio_id INTEGER NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
          nombre TEXT NOT NULL,
          fecha_inicio DATE NOT NULL,
          fecha_fin DATE,
          descripcion TEXT DEFAULT ''
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS holidays (
          id SERIAL PRIMARY KEY,
          country TEXT NOT NULL DEFAULT 'CO',
          fecha DATE NOT NULL,
          nombre TEXT NOT NULL
        );
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS holidays_country_fecha_uniq
        ON holidays(country, fecha);
      `);

      console.log("✅ PG migrate listo (municipalities/festivals/holidays)");
    } catch (e) {
      console.error("❌ Error en pgMigrate():", e);
    }
  }

  pgMigrate();

  module.exports = {
    mode: "postgres",

    all: (sql, params, cb) => {
      if (typeof params === "function") {
        cb = params;
        params = [];
      }
      pool
        .query(sql, params)
        .then((r) => cb(null, r.rows))
        .catch((e) => cb(e));
    },

    get: (sql, params, cb) => {
      if (typeof params === "function") {
        cb = params;
        params = [];
      }
      pool
        .query(sql, params)
        .then((r) => cb(null, r.rows[0] ?? null))
        .catch((e) => cb(e));
    },

    run: (sql, params, cb) => {
      if (typeof params === "function") {
        cb = params;
        params = [];
      }
      pool
        .query(sql, params)
        .then((r) => cb && cb(null, r))
        .catch((e) => cb && cb(e));
    },

    _pool: pool,
  };

  return;
}

// =========================
// SQLITE (Local / Dev)
// =========================
const sqlite3 = require("sqlite3").verbose();
const sqlitePath = path.join(__dirname, "database.sqlite");

if (!fs.existsSync(sqlitePath)) fs.writeFileSync(sqlitePath, "");

const rawDb = new sqlite3.Database(sqlitePath, (err) => {
  if (err) console.error("❌ Error connecting to SQLite", err);
  else console.log("✅ SQLite connected:", sqlitePath);
});

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    rawDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function sqliteMigrate() {
  try {
    await runAsync("PRAGMA foreign_keys = ON;");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS municipalities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        departamento TEXT NOT NULL,
        descripcion TEXT DEFAULT ''
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS festivals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        municipio_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT,
        descripcion TEXT DEFAULT '',
        FOREIGN KEY (municipio_id) REFERENCES municipalities(id) ON DELETE CASCADE
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT NOT NULL DEFAULT 'CO',
        fecha TEXT NOT NULL,
        nombre TEXT NOT NULL
      )
    `);

    await runAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS holidays_country_fecha_uniq
      ON holidays(country, fecha)
    `);

    console.log("✅ SQLite migrate listo (municipalities/festivals/holidays)");
  } catch (e) {
    console.error("❌ Error en sqliteMigrate():", e);
  }
}

rawDb.serialize(() => {
  sqliteMigrate();
});

// Exportamos MISMA interfaz que Postgres
module.exports = {
  mode: "sqlite",
  SQLITE_PATH: sqlitePath,

  all: (sql, params, cb) => {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    rawDb.all(sql, params, cb);
  },

  get: (sql, params, cb) => {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    rawDb.get(sql, params, cb);
  },

  run: (sql, params, cb) => {
    if (typeof params === "function") {
      cb = params;
      params = [];
    }
    rawDb.run(sql, params, cb);
  },

  _db: rawDb,
};