const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser"); // Asegúrate de que esto esté en tu package.json
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// --- FUNCIÓN PARA CARGAR LOS 1125 MUNICIPIOS ---
const importarDatos = async () => {
  const filePath = path.join(__dirname, "data", "datos_nacionales.csv");
  
  // Verificamos si el archivo existe en la carpeta data
  if (!fs.existsSync(filePath)) {
    console.log("⚠️ No encontré el archivo en: " + filePath);
    return;
  }

  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      console.log(`🚀 Procesando ${results.length} municipios...`);
      try {
        for (const row of results) {
          // Ajusta los nombres de las columnas según tu CSV
          await pool.query(
            `INSERT INTO festivales ("Código_id", municipio, departamento, festival, habitantes, altura)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [row.Código_id, row.municipio, row.departamento, row.festival, row.habitantes, row.altura]
          );
        }
        console.log("✅ ¡Importación masiva completada!");
      } catch (err) {
        console.error("❌ Error insertando datos:", err.message);
      }
    });
};

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error adquiriendo cliente', err.stack);
  }
  console.log('✅ Conexión a PostgreSQL establecida');
  importarDatos(); // <--- Aquí arranca la magia apenas conecta
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};