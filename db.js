const { Pool } = require("pg");

try {
  require("dotenv").config();
} catch (e) {
  console.log("Usando variables de entorno de Render");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  mode: "postgres",
  query: (text, params) => pool.query(text, params),
  get: async (text, params) => {
    try {
      const res = await pool.query(text, params);
      return res.rows[0];
    } catch (err) {
      console.error("Error en db.get:", err);
      throw err;
    }
  },
  all: async (text, params) => {
    try {
      const res = await pool.query(text, params);
      return res.rows;
    } catch (err) {
      console.error("Error en db.all:", err);
      throw err;
    }
  }
};