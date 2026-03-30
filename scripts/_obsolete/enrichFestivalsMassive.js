const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { stringify } = require("csv-stringify/sync");

// ===== CONFIG =====
const INPUT_CSV = path.join(__dirname, "..", "data", "municipios_master.csv");
const OUTPUT_CSV = path.join(__dirname, "..", "data", "municipios_master_enriquecido.csv");

const CONCURRENCY = 1;          // 🔴 antes 3 → ahora 1 (clave)
const PAUSE_MS = 2000;         // 🔴 más lento pero estable
const RETRIES = 3;

// ===== UTILS =====
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ===== CSV ROBUSTO =====
function loadCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter(l => l.trim() !== "");

  const headers = lines[0].split(",");
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    let cols = lines[i].split(",");

    while (cols.length < headers.length) cols.push("");
    if (cols.length > headers.length) cols = cols.slice(0, headers.length);

    const obj = {};
    headers.forEach((h, idx) => obj[h] = cols[idx]);
    rows.push(obj);
  }

  return { headers, rows };
}

// ===== REQUEST CON RETRY =====
async function safeRequest(url) {
  for (let i = 0; i < RETRIES; i++) {
    try {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0",
        }
      });
      return res.data;
    } catch (err) {
      if (i === RETRIES - 1) return "";
      await sleep(2000);
    }
  }
}

// ===== BUSQUEDA SIMPLE =====
async function buscarFestival(row) {
  const query = `${row.municipio} ${row.departamento} festival Colombia`;
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;

  const data = await safeRequest(url);

  if (!data) return null;

  const text = JSON.stringify(data);

  if (text.toLowerCase().includes("carnaval")) {
    return {
      nombre: "Carnaval (detectado)",
      fecha_texto: "pendiente",
      fuente: "duckduckgo-lite",
    };
  }

  if (text.toLowerCase().includes("feria")) {
    return {
      nombre: "Feria (detectada)",
      fecha_texto: "pendiente",
      fuente: "duckduckgo-lite",
    };
  }

  return null;
}

// ===== MAIN =====
async function main() {
  const { headers, rows } = loadCsv(INPUT_CSV);

  console.log(`Filas leídas: ${rows.length}`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    console.log(`${i + 1}/${rows.length} - ${row.municipio}`);

    if (row.festividad_nombre && !row.festividad_nombre.toLowerCase().includes("fiestas de")) {
      continue;
    }

    const result = await buscarFestival(row);

    if (result) {
      row.festividad_nombre = result.nombre;
      row.festividad_fecha_texto = result.fecha_texto;
      row.fuente_festividad = result.fuente;
      row.estado_revision = "parcial";
    }

    await sleep(PAUSE_MS);
  }

  const csv = stringify(rows, {
    header: true,
    columns: headers,
  });

  fs.writeFileSync(OUTPUT_CSV, csv);

  console.log("✅ TERMINADO");
}

main();