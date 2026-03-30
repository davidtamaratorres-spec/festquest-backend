const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const DATA_DIR = path.join(__dirname, "..", "data");

const MASTER = path.join(DATA_DIR, "municipios_master_enriquecido.csv");
const REGLAS = path.join(DATA_DIR, "reglas_fechas_2026.csv");

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function read(file) {
  return parse(fs.readFileSync(file, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
}

const master = read(MASTER);
const reglas = read(REGLAS);

const mapa = new Map();

for (const r of reglas) {
  const key = norm(r.nombre);
  mapa.set(key, r);
}

let actualizados = 0;

for (const row of master) {
  const key = norm(row.festividad_nombre);

  if (!key) continue;

  const regla = mapa.get(key);

  if (regla) {
    row.festividad_fecha_inicio = regla.fecha_inicio || "";
    row.festividad_fecha_fin = regla.fecha_fin || "";
    row.festividad_fecha_texto = regla.fecha_texto || "";
    actualizados++;
  }
}

const output = stringify(master, { header: true });

fs.writeFileSync(MASTER, output, "utf8");

console.log("Festivales actualizados:", actualizados);