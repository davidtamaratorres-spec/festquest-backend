const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT = path.join(__dirname, "../data_std/festivals_list.csv");
const OUTPUT = path.join(__dirname, "../data_std/festivals_batch_200.csv");

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
  console.log("📦 GENERANDO LOTE 200");

  const data = await loadCSV(INPUT);

  const filtered = data.filter(
    r => (r.departamento || "").toLowerCase() !== "amazonas"
  );

  const batch = filtered.slice(0, 200);

  const headers = Object.keys(batch[0]);

  const csvOut = [
    headers.join(","),
    ...batch.map(r =>
      headers.map(h => `"${(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT, csvOut);

  console.log("✅ Lote generado:", batch.length);
  console.log("📁 Archivo:", OUTPUT);
}

run();