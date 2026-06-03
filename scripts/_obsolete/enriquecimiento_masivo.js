const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT_FILE = path.join(__dirname, "..", "data", "plantilla_enriquecimiento.csv");
const DATASET_FILE = path.join(__dirname, "..", "data", "festivales_reales.csv");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "plantilla_enriquecimiento_completa.csv");

function limpiarTexto(valor) {
  return String(valor ?? "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTexto(valor) {
  return limpiarTexto(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escaparCSV(valor) {
  const texto = limpiarTexto(valor);
  if (texto.includes(",") || texto.includes('"')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function cargarCSV(filePath) {
  return new Promise((resolve, reject) => {
    const filas = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => filas.push(row))
      .on("end", () => resolve(filas))
      .on("error", (err) => reject(err));
  });
}

function esFestivalBasura(nombre) {
  const n = normalizarTexto(nombre);

  if (!n) return true;

  return (
    n.startsWith("fiestas de") ||
    n.startsWith("festival de") ||
    n.includes("celebracion municipal") ||
    n.includes("evento local") ||
    n.length < 8
  );
}

function buscarFestival(rowMunicipio, datasetFestivales) {
  const codigoDane = limpiarTexto(rowMunicipio.codigo_dane);
  const municipio = normalizarTexto(rowMunicipio.municipio);
  const departamento = normalizarTexto(rowMunicipio.departamento);

  let match = null;

  if (codigoDane) {
    match = datasetFestivales.find(
      (d) => limpiarTexto(d.codigo_dane) === codigoDane
    );
    if (match) return match;
  }

  match = datasetFestivales.find((d) => {
    const mun = normalizarTexto(d.municipio);
    const dep = normalizarTexto(d.departamento);
    return mun === municipio && dep === departamento;
  });
  if (match) return match;

  match = datasetFestivales.find((d) => {
    const mun = normalizarTexto(d.municipio);
    const dep = normalizarTexto(d.departamento);
    return mun.includes(municipio) && dep === departamento;
  });
  if (match) return match;

  match = datasetFestivales.find((d) => {
    const mun = normalizarTexto(d.municipio);
    return mun === municipio;
  });
  if (match) return match;

  return null;
}

function enriquecerMunicipio(row, datasetFestivales) {
  const resultado = {
    ...row,
    festival_principal: limpiarTexto(row.festival_principal),
    fecha_inicio: limpiarTexto(row.fecha_inicio),
    fecha_fin: limpiarTexto(row.fecha_fin),
    descripcion_festival: limpiarTexto(row.descripcion_festival),
    sitio_1: limpiarTexto(row.sitio_1),
    maps_1: limpiarTexto(row.maps_1),
    sitio_2: limpiarTexto(row.sitio_2),
    maps_2: limpiarTexto(row.maps_2),
    sitio_3: limpiarTexto(row.sitio_3),
    maps_3: limpiarTexto(row.maps_3),
    hotel_1: limpiarTexto(row.hotel_1),
    wa_1: limpiarTexto(row.wa_1),
    hotel_2: limpiarTexto(row.hotel_2),
    wa_2: limpiarTexto(row.wa_2),
    hotel_3: limpiarTexto(row.hotel_3),
    wa_3: limpiarTexto(row.wa_3),
    fuente_datos: limpiarTexto(row.fuente_datos),
    estado_enriquecimiento: limpiarTexto(
      row.estado_enriquecimiento || "pendiente"
    ),
    observaciones: limpiarTexto(row.observaciones),
  };

  const festivalMatch = buscarFestival(row, datasetFestivales);

  if (festivalMatch && !esFestivalBasura(festivalMatch.festival)) {
    resultado.festival_principal = limpiarTexto(festivalMatch.festival);
    resultado.fecha_inicio = limpiarTexto(festivalMatch.fecha_inicio);
    resultado.fecha_fin = limpiarTexto(festivalMatch.fecha_fin);
    resultado.descripcion_festival = limpiarTexto(festivalMatch.descripcion);
    resultado.fuente_datos = "dataset_festivales_reales";
    resultado.estado_enriquecimiento = "parcial";
    resultado.observaciones = "festival cargado desde dataset real";
  } else if (festivalMatch && esFestivalBasura(festivalMatch.festival)) {
    resultado.estado_enriquecimiento = "pendiente_revision";
    resultado.observaciones = "festival generico detectado";
    resultado.fuente_datos = "dataset_festivales_reales";
  } else {
    resultado.estado_enriquecimiento = "sin_datos";
    resultado.observaciones = "sin match en dataset real";
  }

  return resultado;
}

async function run() {
  try {
    console.log("Cargando plantilla...");
    const plantilla = await cargarCSV(INPUT_FILE);

    console.log("Cargando dataset real...");
    const datasetFestivales = await cargarCSV(DATASET_FILE);

    console.log("Municipios leídos:", plantilla.length);
    console.log("Festivales reales leídos:", datasetFestivales.length);

    if (!plantilla.length) {
      throw new Error("La plantilla está vacía");
    }

    const columnas = Object.keys(plantilla[0]);

    const enriquecidos = plantilla.map((row) =>
      enriquecerMunicipio(row, datasetFestivales)
    );

    const header = columnas.join(",") + "\n";
    const body = enriquecidos
      .map((fila) => columnas.map((col) => escaparCSV(fila[col])).join(","))
      .join("\n");

    fs.writeFileSync(OUTPUT_FILE, header + body, "utf8");

    const conFestival = enriquecidos.filter(
      (x) => limpiarTexto(x.festival_principal) !== ""
    ).length;

    const sinDatos = enriquecidos.filter(
      (x) => limpiarTexto(x.estado_enriquecimiento) === "sin_datos"
    ).length;

    const pendienteRevision = enriquecidos.filter(
      (x) => limpiarTexto(x.estado_enriquecimiento) === "pendiente_revision"
    ).length;

    console.log("✅ Archivo enriquecido generado:");
    console.log(OUTPUT_FILE);
    console.log("Municipios con festival:", conFestival);
    console.log("Municipios sin datos:", sinDatos);
    console.log("Municipios pendientes de revisión:", pendienteRevision);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

run();