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
    const res = await pool.query(text, params);
    return res.rows[0];
  },
  all: async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows;
  }
};