const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const filePath = path.join(__dirname, "..", "data", "master_alimentacion.csv");

function limpiarTexto(valor) {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

function limpiarCodigoDane(valor) {
  const codigo = String(valor ?? "").replace(/\D/g, "");
  return codigo === "" ? null : Number(codigo);
}

function limpiarEntero(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;

  let normalizado = texto.replace(/[^\d.,-]/g, "");

  const puntos = (normalizado.match(/\./g) || []).length;
  const comas = (normalizado.match(/,/g) || []).length;

  if (puntos > 1) {
    normalizado = normalizado.replace(/\./g, "");
  } else if (puntos === 1 && comas === 0) {
    const decimales = normalizado.split(".")[1] || "";
    if (decimales.length === 3) {
      normalizado = normalizado.replace(".", "");
    }
  }

  normalizado = normalizado.replace(",", ".");

  const numero = Number.parseFloat(normalizado);
  return Number.isFinite(numero) ? Math.round(numero) : null;
}

async function upsertMunicipality(row) {
  const codigoDane = limpiarCodigoDane(row.codigo_dane);
  const nombre = limpiarTexto(row.municipio);
  const departamento = limpiarTexto(row.departamento);

  if (!codigoDane || !nombre) {
    return null;
  }

  const existing = await pool.query(
    "SELECT id FROM municipalities WHERE codigo_dane = $1 LIMIT 1",
    [codigoDane]
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;

    await pool.query(
      `
      UPDATE municipalities
      SET nombre = $1,
          departamento = $2
      WHERE id = $3
      `,
      [nombre, departamento, id]
    );

    return id;
  }

  const byName = await pool.query(
    `
    SELECT id
    FROM municipalities
    WHERE LOWER(nombre) = LOWER($1)
    LIMIT 1
    `,
    [nombre]
  );

  if (byName.rows.length > 0) {
    const id = byName.rows[0].id;

    await pool.query(
      `
      UPDATE municipalities
      SET codigo_dane = $1,
          nombre = $2,
          departamento = $3
      WHERE id = $4
      `,
      [codigoDane, nombre, departamento, id]
    );

    return id;
  }

  const inserted = await pool.query(
    `
    INSERT INTO municipalities (
      codigo_dane,
      nombre,
      departamento
    )
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [codigoDane, nombre, departamento]
  );

  return inserted.rows[0].id;
}

async function festivalExists(nombre, municipioId, fechaInicio) {
  const existing = await pool.query(
    `
    SELECT id
    FROM festivals
    WHERE nombre = $1
      AND municipio_id = $2
      AND fecha_inicio IS NOT DISTINCT FROM $3::date
    LIMIT 1
    `,
    [nombre, municipioId, fechaInicio]
  );

  return existing.rows[0]?.id || null;
}

async function insertFestival(row, municipioId) {
  const nombre = limpiarTexto(row.festival);
  const fechaInicio = limpiarTexto(row.fecha_inicio);
  const fechaFin = limpiarTexto(row.fecha_fin);
  const descripcion = limpiarTexto(row.descripcion_festival);
  const habitantes = limpiarEntero(row.habitantes);
  const altura = limpiarEntero(row.altura);
  const lugarEncuentro = limpiarTexto(row.sitio_1);
  const mapsLink = limpiarTexto(row.maps_1);
  const whatsappLink = limpiarTexto(row.wa_1);

  const festivalId = await festivalExists(nombre, municipioId, fechaInicio);

  if (festivalId) {
    const fields = [];
    const values = [];

    function addField(column, value) {
      if (value === null || value === undefined || value === "") {
        return;
      }

      values.push(value);
      fields.push(`${column} = $${values.length}`);
    }

    addField("descripcion", descripcion);
    addField("habitantes", habitantes);
    addField("altura", altura);
    addField("lugar_encuentro", lugarEncuentro);
    addField("maps_link", mapsLink);
    addField("whatsapp_link", whatsappLink);

    if (fields.length === 0) {
      return "skipped";
    }

    values.push(festivalId);

    await pool.query(
      `
      UPDATE festivals
      SET ${fields.join(", ")}
      WHERE id = $${values.length}
      `,
      values
    );

    return "updated";
  }

  await pool.query(
    `
    INSERT INTO festivals (
      nombre,
      fecha,
      fecha_inicio,
      fecha_fin,
      descripcion,
      municipio_id,
      habitantes,
      altura,
      lugar_encuentro,
      maps_link,
      whatsapp_link
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      nombre,
      fechaInicio,
      fechaInicio,
      fechaFin,
      descripcion,
      municipioId,
      habitantes,
      altura,
      lugarEncuentro,
      mapsLink,
      whatsappLink,
    ]
  );

  return "inserted";
}

async function run() {
  try {
    console.log("Iniciando carga de festivales...");

    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", async () => {
        console.log(`Filas leidas: ${rows.length}`);

        let municipalitiesUpserted = 0;
        let festivalsInserted = 0;
        let festivalsUpdated = 0;
        let festivalsSkipped = 0;
        const processedMunicipalities = new Map();

        for (const row of rows) {
          const codigoDane = limpiarCodigoDane(row.codigo_dane);
          const nombreFestival = limpiarTexto(row.festival);

          if (!codigoDane || !nombreFestival) {
            festivalsSkipped++;
            continue;
          }

          let municipioId = processedMunicipalities.get(codigoDane);

          if (!municipioId) {
            municipioId = await upsertMunicipality(row);

            if (!municipioId) {
              festivalsSkipped++;
              continue;
            }

            processedMunicipalities.set(codigoDane, municipioId);
            municipalitiesUpserted++;
          }

          const result = await insertFestival(row, municipioId);

          if (result === "inserted") {
            festivalsInserted++;
          } else if (result === "updated") {
            festivalsUpdated++;
          } else {
            festivalsSkipped++;
          }
        }

        console.log("Resumen de carga:");
        console.log(`Municipios insertados/actualizados: ${municipalitiesUpserted}`);
        console.log(`Festivales insertados: ${festivalsInserted}`);
        console.log(`Festivales actualizados: ${festivalsUpdated}`);
        console.log(`Festivales saltados: ${festivalsSkipped}`);
        process.exit(0);
      })
      .on("error", (error) => {
        console.error("Error leyendo CSV:", error.message);
        process.exit(1);
      });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

run();
