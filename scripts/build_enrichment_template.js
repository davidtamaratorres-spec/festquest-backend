const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT = path.join(__dirname, "../data_std/municipios_con_festivales.csv");
const OUTPUT = path.join(__dirname, "../data_std/municipios_enrichment_template.csv");

function loadCSV(filePath) {
  return new Promise((resolve) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}

async function run() {
  console.log("📦 GENERANDO TEMPLATE DE ENRIQUECIMIENTO");

  const data = await loadCSV(INPUT);

  const out = data.map(r => ({
    codigo_dane: r.codigo_dane,
    municipio: r.municipio,
    departamento: r.departamento,

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
  }));

  const headers = Object.keys(out[0]);

  const csvOut = [
    headers.join(","),
    ...out.map(r =>
      headers.map(h => `"${(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT, csvOut);

  console.log("✅ Template creado:", out.length);
  console.log("📁 Archivo:", OUTPUT);
}

run();