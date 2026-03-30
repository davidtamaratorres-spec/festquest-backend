const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT_FILE = path.join(__dirname, "..", "data", "municipios_de_colombia.csv");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "plantilla_enriquecimiento.csv");

const columnas = [
  "codigo_dane",
  "departamento",
  "municipio",
  "subregion",
  "provincia",
  "categoria_municipal",
  "cabecera_municipal",
  "poblacion",
  "altitud_ms_nm",
  "temperatura_promedio",
  "superficie_km2",
  "latitud",
  "longitud",
  "anio_fundacion",
  "gentilicio",
  "festival_principal",
  "fecha_inicio",
  "fecha_fin",
  "descripcion_festival",
  "sitio_1",
  "maps_1",
  "sitio_2",
  "maps_2",
  "sitio_3",
  "maps_3",
  "hotel_1",
  "wa_1",
  "hotel_2",
  "wa_2",
  "hotel_3",
  "wa_3",
  "fuente_datos",
  "estado_enriquecimiento",
  "observaciones",
];

function limpiarTexto(valor) {
  return String(valor ?? "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escaparCSV(valor) {
  const texto = limpiarTexto(valor);
  if (texto.includes(",") || texto.includes('"')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

async function run() {
  console.log("Generando plantilla de enriquecimiento...");

  const filas = [];

  fs.createReadStream(INPUT_FILE)
    .pipe(csv())
    .on("data", (row) => {
      filas.push({
        codigo_dane: limpiarTexto(row.codigo_dane || row.Codigo_id || ""),
        departamento: limpiarTexto(row.departamento || ""),
        municipio: limpiarTexto(row.municipio || ""),
        subregion: limpiarTexto(row.subregion || ""),
        provincia: limpiarTexto(row.provincia || ""),
        categoria_municipal: limpiarTexto(row.categoria_municipal || ""),
        cabecera_municipal: limpiarTexto(row.cabecera_municipal || ""),
        poblacion: limpiarTexto(row.poblacion || ""),
        altitud_ms_nm: limpiarTexto(row.altitud_ms_nm || row.altura || ""),
        temperatura_promedio: limpiarTexto(row.temperatura_promedio || ""),
        superficie_km2: limpiarTexto(row.superficie_km2 || ""),
        latitud: limpiarTexto(row.latitud || ""),
        longitud: limpiarTexto(row.longitud || ""),
        anio_fundacion: limpiarTexto(row.anio_fundacion || ""),
        gentilicio: limpiarTexto(row.gentilicio || ""),

        // campos nuevos vacíos
        festival_principal: "",
        fecha_inicio: "",
        fecha_fin: "",
        descripcion_festival: "",
        sitio_1: "",
        maps_1: "",
        sitio_2: "",
        maps_2: "",
        sitio_3: "",
        maps_3: "",
        hotel_1: "",
        wa_1: "",
        hotel_2: "",
        wa_2: "",
        hotel_3: "",
        wa_3: "",
        fuente_datos: "",
        estado_enriquecimiento: "pendiente",
        observaciones: "",
      });
    })
    .on("end", () => {
      console.log("Municipios leídos:", filas.length);

      const header = columnas.join(",") + "\n";

      const body = filas
        .map((fila) =>
          columnas.map((col) => escaparCSV(fila[col])).join(",")
        )
        .join("\n");

      fs.writeFileSync(OUTPUT_FILE, header + body, "utf8");

      console.log("✅ Plantilla generada en:");
      console.log(OUTPUT_FILE);
    })
    .on("error", (err) => {
      console.error("❌ Error:", err.message);
    });
}

run();