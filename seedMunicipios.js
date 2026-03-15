const fs = require("fs");
const csv = require("csv-parser");
const db = require("./db");

const resultados = [];

fs.createReadStream("./data/datos_nacionales.csv")
  .pipe(csv())
  .on("data", (data) => {
    resultados.push(data);
  })
  .on("end", async () => {
    console.log("Registros encontrados:", resultados.length);

    try {
      for (const fila of resultados) {
        const municipio = fila.municipio ? fila.municipio.trim() : null;
        const departamento = fila.departamento ? fila.departamento.trim() : null;
        const festival = fila.festival ? fila.festival.trim() : null;
        const fecha = fila.fecha ? fila.fecha.trim() : null;

        const habitantesTexto = fila.habitantes
          ? fila.habitantes.toString().trim().toLowerCase()
          : "";
        const alturaTexto = fila.altura
          ? fila.altura.toString().trim().toLowerCase()
          : "";

        let habitantes = null;
        let altura = null;

        if (habitantesTexto) {
          const limpio = habitantesTexto.replace(/,/g, "").replace(/\s/g, "");
          if (limpio.endsWith("k")) {
            habitantes = Math.round(parseFloat(limpio.replace("k", "")) * 1000);
          } else if (limpio.endsWith("m")) {
            habitantes = Math.round(parseFloat(limpio.replace("m", "")) * 1000000);
          } else {
            const num = parseInt(limpio.replace(/[^\d]/g, ""), 10);
            habitantes = isNaN(num) ? null : num;
          }
        }

        if (alturaTexto) {
          const num = parseInt(alturaTexto.replace(/[^\d]/g, ""), 10);
          altura = isNaN(num) ? null : num;
        }

        const lugarEncuentro = fila.sitio_1 ? fila.sitio_1.trim() : null;
        const mapsLink = fila.maps_1 ? fila.maps_1.trim() : null;
        const whatsappLink = fila.wa_1 ? fila.wa_1.trim() : null;

        if (!municipio || !departamento) {
          console.log("⚠️ Fila omitida por falta de municipio/departamento:", fila);
          continue;
        }

        const municipioInsert = await db.query(
          `
          INSERT INTO municipalities (nombre, departamento)
          VALUES ($1, $2)
          ON CONFLICT (nombre) DO NOTHING
          RETURNING id
          `,
          [municipio, departamento]
        );

        let municipioId;

        if (municipioInsert.rows.length > 0) {
          municipioId = municipioInsert.rows[0].id;
        } else {
          const buscar = await db.query(
            `SELECT id FROM municipalities WHERE nombre = $1`,
            [municipio]
          );

          if (buscar.rows.length === 0) {
            console.log("⚠️ No se encontró municipio después del insert:", municipio);
            continue;
          }

          municipioId = buscar.rows[0].id;
        }

        if (festival) {
          await db.query(
            `
            INSERT INTO festivals (
              nombre,
              fecha,
              descripcion,
              municipio_id,
              habitantes,
              altura,
              lugar_encuentro,
              maps_link,
              whatsapp_link
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `,
            [
              festival,
              fecha,
              null,
              municipioId,
              habitantes,
              altura,
              lugarEncuentro,
              mapsLink,
              whatsappLink,
            ]
          );
        }
      }

      console.log("✅ Datos cargados correctamente");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      process.exit(1);
    }
  })
  .on("error", (error) => {
    console.error("❌ Error leyendo el CSV:", error);
    process.exit(1);
  });