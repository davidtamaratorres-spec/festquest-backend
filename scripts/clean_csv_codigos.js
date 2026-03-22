const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT_DIR = path.join(__dirname, "../data");
const OUTPUT_DIR = path.join(__dirname, "../data_clean");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const FILES = [
  "datos_nacionales_base.csv",
  "datos_nacionales_geo.csv",
  "datos_nacionales_clima.csv",
  "datos_nacionales_subregion.csv",
];

// ===============================
function normalizeCodigo(codigo) {
  if (!codigo) return null;

  const limpio = String(codigo).replace(/\D/g, "");

  if (!limpio || limpio === "00000") return null;

  return limpio.padStart(5, "0");
}

function clean(text) {
  if (!text) return null;
  return String(text).trim();
}

// ===============================
function processFile(file) {
  return new Promise((resolve) => {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    const results = [];

    fs.createReadStream(inputPath)
      .pipe(csv())
      .on("data", (row) => {
        const codigo = normalizeCodigo(
          row.codigo ||
          row.codigo_dane ||
          row.Codigo ||
          row.Codigo_id ||
          row["Código DANE"]
        );

        const nombre = clean(
          row.municipio || row.nombre || row.Municipio
        );

        if (!codigo) return;
        if (!nombre) return;
        if (nombre.toLowerCase() === "nacional") return;

        row.codigo_dane = codigo;

        results.push(row);
      })
      .on("end", () => {
        const headers = Object.keys(results[0] || {});
        const csvContent = [
          headers.join(","),
          ...results.map(r =>
            headers.map(h => `"${(r[h] || "").toString().replace(/"/g, "")}"`).join(",")
          ),
        ].join("\n");

        fs.writeFileSync(outputPath, csvContent);

        console.log("✅ Limpio:", file, "| filas:", results.length);
        resolve();
      });
  });
}

// ===============================
async function run() {
  console.log("🧹 LIMPIANDO CSV...");

  for (const file of FILES) {
    await processFile(file);
  }

  console.log("✅ LIMPIEZA COMPLETA → carpeta data_clean");
}

run();