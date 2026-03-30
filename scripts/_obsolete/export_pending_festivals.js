const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT = path.join(__dirname, "../data_std/remaining_batches_classification_report.csv");
const OUT = path.join(__dirname, "../data_std/pending_festivals.csv");

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

async function run() {
  const rows = await loadCSV(INPUT);
  const pending = rows.filter(r => (r.status || "").toLowerCase() === "pendiente");

  if (!pending.length) {
    console.log("Pendientes: 0");
    return;
  }

  const headers = Object.keys(pending[0]);
  const csvOut = [
    headers.join(","),
    ...pending.map(r =>
      headers.map(h => `"${String(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUT, csvOut, "utf8");

  console.log("✅ Pendientes exportados:", pending.length);
  console.log("📁 Archivo:", OUT);
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});