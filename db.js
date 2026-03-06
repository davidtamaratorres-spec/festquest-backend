const { Pool } = require('pg');

// Usamos la variable de entorno DATABASE_URL que te da Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requerido para conexiones seguras en Render
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};