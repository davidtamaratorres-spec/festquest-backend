const { Pool } = require("pg");
// Intenta cargar dotenv solo si existe
try {
  require("dotenv").config();
} catch (e) {
  console.log("Dotenv no encontrado, usando variables de entorno de Render");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};