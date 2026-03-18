const fs = require("fs");
const csv = require("csv-parser");
const db = require("../db");

const FILE = "data/datos_nacionales_subregion.csv";

async function importar() {

  console.log("Cargando municipios...");

  const municipios = [];

  fs.createReadStream(FILE)
    .pipe(csv())
    .on("data", (row) => {

      municipios.push({
        codigo_id: row.Codigo_id,
        departamento: row.departamento,
        municipio: row.municipio,
        subregion: row.Subregion,
        habitantes: row.habitantes || null,
        temperatura: row.temperatura_promedio || null,
        altura: row.altura || null,
        latitud: row.latitud || null,
        longitud: row.longitud || null
      });

    })
    .on("end", async () => {

      console.log("Municipios leídos:", municipios.length);

      for (const m of municipios) {

        await db.query(
          `INSERT INTO municipalities 
          (nombre, departamento)
          VALUES ($1,$2)
          ON CONFLICT (nombre) DO NOTHING`,
          [m.municipio, m.departamento]
        );

      }

      console.log("Municipios importados correctamente");
      process.exit();

    });

}

importar();