const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Verificación de conexión para los logs
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error adquiriendo cliente de base de datos', err.stack);
  }
  console.log('✅ Conexión a PostgreSQL establecida con éxito');
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};