const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const DATA = path.join(__dirname, "..", "data");

const MASTER = path.join(DATA, "master_alimentacion.csv");
const OBS = path.join(DATA, "_obsolete", "datos_nacionales_subregion.csv");

function read(file) {
  return parse(fs.readFileSync(file, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
}

function norm(v) {
  return String(v || "").trim();
}

const master = read(MASTER);
const obs = read(OBS);

const mapa = new Map();

for (const r of obs) {
  const key = norm(r.codigo_dane);
  if (key) {
    mapa.set(key, r);
  }
}

let llenados = 0;

for (const row of master) {
  const key = norm(row.codigo_dane);
  const ref = mapa.get(key);

  if (!ref) continue;

  if (!row.subregion) row.subregion = ref.subregion || "";
  if (!row.habitantes) row.habitantes = ref.habitantes || "";
  if (!row.temperatura_promedio) row.temperatura_promedio = ref.temperatura_promedio || "";
  if (!row.altura) row.altura = ref.altura || "";

  llenados++;
}

fs.writeFileSync(MASTER, stringify(master, { header: true }), "utf8");

console.log("Registros actualizados:", llenados);