const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT = path.join(__dirname, "../data_std/festivals_list.csv");
const OUT_DIR = path.join(__dirname, "../data_std");

function loadCSV(filePath) {
  return new Promise((resolve) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}

function writeCSV(filePath, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvOut = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => `"${(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");
  fs.writeFileSync(filePath, csvOut);
}

async function run() {
  console.log("📦 GENERANDO LOTES RESTANTES");

  const data = await loadCSV(INPUT);

  // ya trabajados: 50 + 200 + 50 = 300
  const remaining = data.slice(300);

  const sizes = [200, 200, 200, 200, 20];
  let start = 0;
  let batchNum = 3;

  for (const size of sizes) {
    const batch = remaining.slice(start, start + size);
    if (!batch.length) break;

    const outFile = path.join(OUT_DIR, `festivals_batch_${batchNum}.csv`);
    writeCSV(outFile, batch);

    console.log(`✅ Lote ${batchNum}:`, batch.length, "->", outFile);

    start += size;
    batchNum++;
  }
}

run();