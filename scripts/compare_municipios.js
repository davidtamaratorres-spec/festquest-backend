const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const DATA_DIR = path.join(__dirname, "..", "data");

const BD_FILE = path.join(DATA_DIR, "municipios_master_enriquecido.csv");
const BASE_FILE = path.join(DATA_DIR, "municipios_master.csv");

function readCsv(file) {
  const raw = fs.readFileSync(file, "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true });
}

function norm(v) {
  return String(v || "").trim();
}

const bd = readCsv(BD_FILE);
const base = readCsv(BASE_FILE);

const bdSet = new Set(bd.map(r => norm(r.codigo_dane)));
const baseSet = new Set(base.map(r => norm(r.codigo_dane)));

const faltantes = [];

for (const row of base) {
  const codigo = norm(row.codigo_dane);
  if (!bdSet.has(codigo)) {
    faltantes.push({
      codigo,
      municipio: row.municipio,
      departamento: row.departamento,
    });
  }
}

console.log("FALTANTES:", faltantes.length);
console.table(faltantes);