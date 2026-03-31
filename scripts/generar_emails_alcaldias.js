const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function normalizar(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "");
}

const municipios = [
"Abejorral","Arboletes","Necoclí","Puerto Nare","San Carlos","San Rafael","Segovia","Támesis","Tarazá","Uramita",
"Corinto","Piendamó","Toribio",
"San Gil","Socorro","Barichara","Vélez",
"Tunja","Villa de Leyva","Duitama","Sogamoso",
"Ibagué","Honda","Espinal",
"Neiva","Pitalito","Garzón",
"Montería","Lorica","Sahagún",
"Sincelejo","Corozal","Tolú",
"Galapa","Soledad",
"Villavicencio","Granada",
"Yopal","Aguazul",
"Riohacha","San Juan del Cesar",
"Quibdó","Istmina",
"Puerto Santander","Mapiripana"
];

async function run() {
  try {
    const result = await pool.query(
      `SELECT nombre, departamento FROM municipalities WHERE nombre = ANY($1)`,
      [municipios]
    );

    if (result.rows.length === 0) {
      console.log("❌ No encontró municipios");
      process.exit();
    }

    const rows = result.rows.map(m => {
      const dominio = `${normalizar(m.nombre)}.gov.co`;
      return `${m.nombre},${m.departamento},alcaldia@${dominio}`;
    });

    const contenido =
      "municipio,departamento,email\n" + rows.join("\n");

    const filePath = path.join(__dirname, "..", "data", "correos_alcaldias.csv");

    fs.writeFileSync(filePath, contenido);

    console.log("✅ Archivo generado en /data/correos_alcaldias.csv");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  } finally {
    process.exit();
  }
}

run();