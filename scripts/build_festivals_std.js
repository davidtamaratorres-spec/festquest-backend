const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const DATA_DIR = path.join(__dirname, "../data");
const OUT_DIR = path.join(__dirname, "../data_std");

const FILES = {
  master: "festivals_master.csv",
  reales: "festivales_reales.csv",
};

const COLS = [
  "codigo_dane",
  "municipio",
  "departamento",
  "nombre_festival",
  "date_start",
  "date_end",
  "year",
  "descripcion",
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
  "source_type",
  "verified",
];

function clean(v) {
  if (!v) return "";
  return String(v).trim();
}

function normalizeCodigo(v) {
  if (!v) return "";
  const d = String(v).replace(/\D/g, "");
  if (!d) return "";
  return d.padStart(5, "0").slice(-5);
}

function loadCSV(file) {
  return new Promise((resolve) => {
    const rows = [];
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (r) => rows.push(r))
      .on("end", () => resolve(rows));
  });
}

function buildRow(r, type) {
  return {
    codigo_dane: normalizeCodigo(r.municipio_codigo_dane || r.codigo_dane),
    municipio: clean(r.municipio),
    departamento: clean(r.departamento),
    nombre_festival: clean(r.nombre),
    date_start: clean(r.date_start || r.fecha),
    date_end: clean(r.date_end),
    year: clean(r.year || "2026"),
    descripcion: clean(r.descripcion),

    sitio_1: clean(r.sitio_1),
    maps_1: clean(r.maps_1),
    sitio_2: clean(r.sitio_2),
    maps_2: clean(r.maps_2),
    sitio_3: clean(r.sitio_3),
    maps_3: clean(r.maps_3),

    hotel_1: clean(r.hotel_1),
    wa_1: clean(r.wa_1),
    hotel_2: clean(r.hotel_2),
    wa_2: clean(r.wa_2),
    hotel_3: clean(r.hotel_3),
    wa_3: clean(r.wa_3),

    source_type: type,
    verified: type === "real" ? "true" : "false",
  };
}

async function run() {
  console.log("🚀 BUILD FESTIVALS STD");

  const master = await loadCSV(path.join(DATA_DIR, FILES.master));
  const reales = await loadCSV(path.join(DATA_DIR, FILES.reales));

  const out = [];

  master.forEach(r => {
    const row = buildRow(r, "base");
    if (row.codigo_dane && row.nombre_festival) out.push(row);
  });

  reales.forEach(r => {
    const row = buildRow(r, "real");
    if (row.codigo_dane && row.nombre_festival) out.push(row);
  });

  const lines = [
    COLS.join(","),
    ...out.map(r =>
      COLS.map(c => `"${(r[c] || "").replace(/"/g, "")}"`).join(",")
    ),
  ];

  fs.writeFileSync(path.join(OUT_DIR, "festivals_std.csv"), lines.join("\n"));

  console.log("✅ festivals_std creado:", out.length);
}

run();