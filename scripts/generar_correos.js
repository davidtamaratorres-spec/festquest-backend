const fs = require("fs");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function generarCorreo(m) {
  return `
Señor(a) Alcalde(a)
Municipio de ${m.municipio}
Departamento de ${m.departamento}

Reciba un cordial saludo.

Me permito presentar FestQuest, una plataforma digital orientada a la visibilización de festivales, cultura y oferta turística de los municipios de Colombia.

Hemos identificado el municipio de ${m.municipio} como un territorio con alto potencial de visibilidad dentro de la plataforma.

Nos gustaría invitar a la administración municipal a validar y complementar la información registrada.

Quedamos atentos a su interés para habilitar el acceso correspondiente.

Cordialmente,

FestQuest
gerencia@festquest.app
https://festquest.app
`;
}

async function run() {
  const result = await pool.query(`
    SELECT nombre AS municipio, departamento
    FROM municipalities
    LIMIT 50
  `);

  const correos = result.rows.map(m => ({
    municipio: m.municipio,
    departamento: m.departamento,
    mensaje: generarCorreo(m)
  }));

  fs.writeFileSync("correos.json", JSON.stringify(correos, null, 2));

  console.log("OK correos generados");
  process.exit();
}

run();