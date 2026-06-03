const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const baseFile = path.join(__dirname, "../data/datos_nacionales_base.csv");
const stdFile = path.join(__dirname, "../data_std/municipios_master_std.csv");

function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function clean(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function normalizeCodigo(value) {
  const raw = clean(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits === "0" || digits === "00000") return "";
  if (digits.length >= 5) return digits.slice(-5);
  return digits.padStart(5, "0");
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function run() {
  const base = await loadCSV(baseFile);
  const std = await loadCSV(stdFile);

  const baseList = base.map((r) => ({
    codigo_dane: normalizeCodigo(
      r.codigo_dane || r.Codigo_id || r.codigo || r.Codigo || r["Código DANE"]
    ),
    municipio: clean(r.municipio || r.Municipio || r.nombre || r["Nombre Municipio"]),
    departamento: clean(r.departamento || r.Departamento || r.departamento_nombre),
  }));

  const stdCodes = new Set(std.map((r) => normalizeCodigo(r.codigo_dane)));

  const missing = baseList.filter(
    (r) =>
      r.codigo_dane &&
      r.municipio &&
      r.departamento &&
      normalizeText(r.municipio) !== "nacional" &&
      !stdCodes.has(r.codigo_dane)
  );

  console.log("Faltantes:", missing.length);
  console.table(missing);
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});