const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const DATA_DIR = path.join(__dirname, "..", "data");
const INPUT_FILE = path.join(DATA_DIR, "municipios_master_enriquecido.csv");
const MASTER_PATH = path.join(DATA_DIR, "municipios_master.csv");

const MASTER_COLUMNS = [
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
  "alcalde_actual",
  "bandera_url",
  "sitios_turisticos",
  "hoteles",
  "hospedajes",
  "contacto_hoteles",
  "festividad_nombre",
  "festividad_fecha_inicio",
  "festividad_fecha_fin",
  "festividad_fecha_texto",
  "resena_festividad",
  "fuente_base",
  "fuente_festividad",
  "fuente_turismo",
  "fuente_hoteles",
  "fuente_alcalde",
  "observaciones",
  "estado_revision",
];

function norm(v) {
  return String(v || "").trim();
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
}

function splitNonEmpty(values) {
  return values.map((v) => norm(v)).filter(Boolean);
}

function joinPipe(values) {
  const clean = splitNonEmpty(values);
  return clean.length ? clean.join(" | ") : "";
}

function mergeExisting(baseRow, existingRow) {
  const merged = {};
  for (const col of MASTER_COLUMNS) {
    merged[col] = norm(existingRow?.[col]) || norm(baseRow?.[col]) || "";
  }
  return merged;
}

function buildBaseRow(row) {
  return {
    codigo_dane: norm(row.codigo_dane),
    departamento: norm(row.departamento),
    municipio: norm(row.municipio),
    subregion: norm(row.subregion),
    provincia: norm(row.provincia),
    categoria_municipal: norm(row.categoria_municipal),
    cabecera_municipal: norm(row.cabecera_municipal),
    poblacion: norm(row.poblacion),
    altitud_ms_nm: norm(row.altitud_ms_nm),
    temperatura_promedio: norm(row.temperatura_promedio),
    superficie_km2: norm(row.superficie_km2),
    latitud: norm(row.latitud),
    longitud: norm(row.longitud),
    anio_fundacion: norm(row.anio_fundacion),
    gentilicio: norm(row.gentilicio),
    alcalde_actual: norm(row.alcalde_actual),
    bandera_url: norm(row.bandera_url),
    sitios_turisticos: norm(row.sitios_turisticos),
    hoteles: norm(row.hoteles),
    hospedajes: norm(row.hospedajes),
    contacto_hoteles: norm(row.contacto_hoteles),
    festividad_nombre: norm(row.festividad_nombre),
    festividad_fecha_inicio: norm(row.festividad_fecha_inicio),
    festividad_fecha_fin: norm(row.festividad_fecha_fin),
    festividad_fecha_texto: norm(row.festividad_fecha_texto),
    resena_festividad: norm(row.resena_festividad),
    fuente_base: "municipios_master_enriquecido.csv",
    fuente_festividad: norm(row.fuente_festividad),
    fuente_turismo: norm(row.fuente_turismo),
    fuente_hoteles: norm(row.fuente_hoteles),
    fuente_alcalde: norm(row.fuente_alcalde),
    observaciones: norm(row.observaciones),
    estado_revision: norm(row.estado_revision) || "pendiente",
  };
}

function loadExistingMaster() {
  if (!fs.existsSync(MASTER_PATH)) return [];
  return readCsv(MASTER_PATH);
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`No existe el archivo base: ${INPUT_FILE}`);
  }

  const baseRows = readCsv(INPUT_FILE);
  const existingRows = loadExistingMaster();

  const existingMap = new Map();
  for (const row of existingRows) {
    const key = norm(row.codigo_dane);
    if (key) existingMap.set(key, row);
  }

  const output = [];
  const seen = new Set();

  for (const row of baseRows) {
    const mapped = buildBaseRow(row);
    const key = norm(mapped.codigo_dane);

    if (!key || !mapped.departamento || !mapped.municipio) continue;
    if (seen.has(key)) continue;

    const existing = existingMap.get(key);
    output.push(mergeExisting(mapped, existing));
    seen.add(key);
  }

  output.sort((a, b) => {
    const dep = a.departamento.localeCompare(b.departamento, "es");
    if (dep !== 0) return dep;
    return a.municipio.localeCompare(b.municipio, "es");
  });

  const csv = stringify(output, {
    header: true,
    columns: MASTER_COLUMNS,
  });

  fs.writeFileSync(MASTER_PATH, csv, "utf8");

  console.log(`Base usada: ${path.basename(INPUT_FILE)}`);
  console.log(`Municipios cargados en maestro: ${output.length}`);
  console.log(`Archivo generado: ${MASTER_PATH}`);
}

main();