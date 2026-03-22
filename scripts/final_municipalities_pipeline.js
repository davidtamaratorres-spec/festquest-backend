const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DATA_DIR = path.join(__dirname, "../data");

const FILES = {
  base: "datos_nacionales_base.csv",
  geo: "datos_nacionales_geo.csv",
  clima: "datos_nacionales_clima.csv",
  subregion: "datos_nacionales_subregion.csv",
};

// ===============================
function clean(text) {
  if (!text) return null;
  return String(text).trim();
}

function normalizeCodigo(codigo) {
  if (!codigo) return null;
  const limpio = String(codigo).replace(/\D/g, "");
  if (!limpio) return null;
  return limpio.padStart(5, "0");
}

function cleanNumber(val) {
  if (!val) return null;

  const limpio = String(val).replace(",", ".").trim();

  if (limpio === "" || limpio === "0.0") return null;

  const num = parseFloat(limpio);

  if (isNaN(num)) return null;

  return Math.round(num);
}

function key(nombre, departamento) {
  return `${clean(nombre).toLowerCase()}|${clean(departamento).toLowerCase()}`;
}

// ===============================
function loadCSV(filePath) {
  return new Promise((resolve) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}

// ===============================
async function run() {
  console.log("🚀 PIPELINE FINAL CORREGIDO");

  const base = await loadCSV(path.join(DATA_DIR, FILES.base));
  const geo = await loadCSV(path.join(DATA_DIR, FILES.geo));
  const clima = await loadCSV(path.join(DATA_DIR, FILES.clima));
  const subregion = await loadCSV(path.join(DATA_DIR, FILES.subregion));

  const master = {};

  // BASE
  base.forEach(r => {
    const codigo = normalizeCodigo(
      r.codigo || r.codigo_dane || r.Codigo || r.Codigo_id
    );

    const nombre = r.municipio || r.nombre || r.Municipio;
    const departamento = r.departamento || r.Departamento;

    if (!codigo || !nombre || !departamento) return;

    const k = key(nombre, departamento);

    master[k] = {
      codigo_dane: codigo,
      nombre,
      departamento,
      subregion: null,
      habitantes: null,
      temperatura_promedio: null,
      altura: null,
      bandera_url: null,
    };
  });

  console.log("📊 BASE:", Object.keys(master).length);

  // GEO
  geo.forEach(r => {
    const k = key(r.municipio, r.departamento);
    if (!master[k]) return;

    master[k].altura = cleanNumber(r.altura) || master[k].altura;
    master[k].habitantes = cleanNumber(r.habitantes) || master[k].habitantes;
  });

  // CLIMA
  clima.forEach(r => {
    const k = key(r.municipio, r.departamento);
    if (!master[k]) return;

    master[k].temperatura_promedio =
      cleanNumber(r.temperatura_promedio) || master[k].temperatura_promedio;
  });

  // SUBREGION
  subregion.forEach(r => {
    const k = key(r.municipio, r.departamento);
    if (!master[k]) return;

    master[k].subregion = clean(r.Subregion) || master[k].subregion;
  });

  const finalList = Object.values(master);

  console.log("📊 FINAL:", finalList.length);

  if (finalList.length !== 1120) {
    console.error("❌ ERROR FINAL:", finalList.length);
    process.exit(1);
  }

  console.log("🧹 Limpiando...");
  await pool.query("DELETE FROM festivals");
  await pool.query("DELETE FROM municipalities");

  console.log("📦 Insertando...");

  for (const m of finalList) {
    await pool.query(
      `
      INSERT INTO municipalities
      (nombre, departamento, codigo_dane, subregion, habitantes, temperatura_promedio, altura, bandera_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        m.nombre,
        m.departamento,
        m.codigo_dane,
        m.subregion,
        m.habitantes,
        m.temperatura_promedio,
        m.altura,
        m.bandera_url,
      ]
    );
  }

  console.log("✅ CARGA FINAL COMPLETA");
  process.exit(0);
}

run();