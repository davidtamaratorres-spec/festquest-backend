const fs = require("fs");
const csv = require("csv-parser");
const db = require("./db");

const CSV_PATH = "./data/datos_nacionales.csv";

function limpiarTexto(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

async function asegurarColumnas() {
  await db.query(`
    ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS codigo_dane INTEGER,
    ADD COLUMN IF NOT EXISTS subregion TEXT,
    ADD COLUMN IF NOT EXISTS habitantes TEXT,
    ADD COLUMN IF NOT EXISTS temperatura_promedio TEXT,
    ADD COLUMN IF NOT EXISTS altura TEXT,
    ADD COLUMN IF NOT EXISTS bandera_url TEXT;
  `);

  await db.query(`
    ALTER TABLE festivals
    ADD COLUMN IF NOT EXISTS sitio_1 TEXT,
    ADD COLUMN IF NOT EXISTS maps_1 TEXT,
    ADD COLUMN IF NOT EXISTS sitio_2 TEXT,
    ADD COLUMN IF NOT EXISTS maps_2 TEXT,
    ADD COLUMN IF NOT EXISTS sitio_3 TEXT,
    ADD COLUMN IF NOT EXISTS maps_3 TEXT,
    ADD COLUMN IF NOT EXISTS hotel_1 TEXT,
    ADD COLUMN IF NOT EXISTS wa_1 TEXT,
    ADD COLUMN IF NOT EXISTS hotel_2 TEXT,
    ADD COLUMN IF NOT EXISTS wa_2 TEXT,
    ADD COLUMN IF NOT EXISTS hotel_3 TEXT,
    ADD COLUMN IF NOT EXISTS wa_3 TEXT;
  `);

  console.log("✅ Columnas verificadas/creadas");
}

async function upsertMunicipality(row) {
  const codigoDane = row.Codigo_id ? Number(row.Codigo_id) : null;
  const nombre = limpiarTexto(row.municipio);
  const departamento = limpiarTexto(row.departamento);
  const subregion = limpiarTexto(row.Subregion);
  const habitantes = limpiarTexto(row.habitantes);
  const temperatura = limpiarTexto(row.temperatura_promedio);
  const altura = limpiarTexto(row.altura);

  const insert = await db.query(
    `
    INSERT INTO municipalities
      (nombre, departamento, codigo_dane, subregion, habitantes, temperatura_promedio, altura)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (nombre)
    DO UPDATE SET
      departamento = EXCLUDED.departamento,
      codigo_dane = EXCLUDED.codigo_dane,
      subregion = EXCLUDED.subregion,
      habitantes = EXCLUDED.habitantes,
      temperatura_promedio = EXCLUDED.temperatura_promedio,
      altura = EXCLUDED.altura
    RETURNING id
    `,
    [nombre, departamento, codigoDane, subregion, habitantes, temperatura, altura]
  );

  return insert.rows[0].id;
}

async function existeFestival(nombre, fecha, municipioId) {
  const r = await db.query(
    `
    SELECT id
    FROM festivals
    WHERE nombre = $1
      AND COALESCE(fecha, '') = COALESCE($2, '')
      AND municipio_id = $3
    LIMIT 1
    `,
    [nombre, fecha, municipioId]
  );

  return r.rows.length > 0 ? r.rows[0].id : null;
}

async function insertarFestival(row, municipioId) {
  const nombre = limpiarTexto(row.festival);
  const fecha = limpiarTexto(row.fecha);

  const yaExiste = await existeFestival(nombre, fecha, municipioId);
  if (yaExiste) {
    await db.query(
      `
      UPDATE festivals
      SET
        sitio_1 = $1,
        maps_1 = $2,
        sitio_2 = $3,
        maps_2 = $4,
        sitio_3 = $5,
        maps_3 = $6,
        hotel_1 = $7,
        wa_1 = $8,
        hotel_2 = $9,
        wa_2 = $10,
        hotel_3 = $11,
        wa_3 = $12
      WHERE id = $13
      `,
      [
        limpiarTexto(row.sitio_1),
        limpiarTexto(row.maps_1),
        limpiarTexto(row.sitio_2),
        limpiarTexto(row.maps_2),
        limpiarTexto(row.sitio_3),
        limpiarTexto(row.maps_3),
        limpiarTexto(row.hotel_1),
        limpiarTexto(row.wa_1),
        limpiarTexto(row.hotel_2),
        limpiarTexto(row.wa_2),
        limpiarTexto(row.hotel_3),
        limpiarTexto(row.wa_3),
        yaExiste,
      ]
    );
    return "updated";
  }

  await db.query(
    `
    INSERT INTO festivals
      (
        nombre,
        fecha,
        descripcion,
        municipio_id,
        sitio_1,
        maps_1,
        sitio_2,
        maps_2,
        sitio_3,
        maps_3,
        hotel_1,
        wa_1,
        hotel_2,
        wa_2,
        hotel_3,
        wa_3
      )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `,
    [
      nombre,
      fecha,
      null,
      municipioId,
      limpiarTexto(row.sitio_1),
      limpiarTexto(row.maps_1),
      limpiarTexto(row.sitio_2),
      limpiarTexto(row.maps_2),
      limpiarTexto(row.sitio_3),
      limpiarTexto(row.maps_3),
      limpiarTexto(row.hotel_1),
      limpiarTexto(row.wa_1),
      limpiarTexto(row.hotel_2),
      limpiarTexto(row.wa_2),
      limpiarTexto(row.hotel_3),
      limpiarTexto(row.wa_3),
    ]
  );

  return "inserted";
}

async function run() {
  try {
    await asegurarColumnas();

    const rows = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        console.log("📄 Filas leídas:", rows.length);

        let municipalitiesCount = 0;
        let insertedFestivals = 0;
        let updatedFestivals = 0;

        for (const row of rows) {
          if (!row.municipio || !row.festival) continue;

          const municipioId = await upsertMunicipality(row);
          municipalitiesCount++;

          const status = await insertarFestival(row, municipioId);
          if (status === "inserted") insertedFestivals++;
          if (status === "updated") updatedFestivals++;
        }

        console.log("✅ Municipios procesados:", municipalitiesCount);
        console.log("✅ Festivales insertados:", insertedFestivals);
        console.log("✅ Festivales actualizados:", updatedFestivals);
        process.exit(0);
      })
      .on("error", (err) => {
        console.error("❌ Error leyendo CSV:", err.message);
        process.exit(1);
      });
  } catch (err) {
    console.error("❌ Error general:", err.message);
    process.exit(1);
  }
}

run();