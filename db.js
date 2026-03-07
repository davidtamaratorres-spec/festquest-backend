const { Pool } = require("pg");
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
  mode: "postgres", // <--- AÑADE ESTA LÍNEA AQUÍ
  query: (text, params) => pool.query(text, params),
  // Añadimos estas funciones para que festivals.js no falle al llamarlas:
  get: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows[0]))
      .catch(err => callback(err));
  },
  all: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows))
      .catch(err => callback(err));
  }
};