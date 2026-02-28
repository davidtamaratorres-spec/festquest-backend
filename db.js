// db.js (FestQuest - PostgreSQL)
// Usa DATABASE_URL en Render. Pool compartido.

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL no está definida. PostgreSQL no podrá conectar.");
}

// Render normalmente requiere SSL en conexiones externas.
// En Internal DB URL a veces también funciona sin SSL, pero lo dejamos robusto.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render.com")
      ? { rejectUnauthorized: false }
      : undefined,
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

async function healthcheck() {
  const r = await pool.query("SELECT 1 as ok");
  return r.rows?.[0] || { ok: 1 };
}

module.exports = {
  pool,
  query,
  healthcheck,
};