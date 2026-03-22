const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT = path.join(__dirname, "../data_std/festivals_list.csv");
const OUTPUT = path.join(__dirname, "../data_std/festivals_dates_generated.csv");

// ===============================
const meses = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

// ===============================
function clean(v) {
  if (!v) return "";
  return String(v).toLowerCase();
}

function detectMonth(text) {
  for (const m in meses) {
    if (text.includes(m)) return meses[m];
  }
  return null;
}

// fallback inteligente por tipo de festival
function inferMonth(nombre) {
  const n = clean(nombre);

  if (n.includes("flores")) return "08";
  if (n.includes("carnaval")) return "02";
  if (n.includes("navidad")) return "12";
  if (n.includes("independencia")) return "07";
  if (n.includes("feria")) return "08";

  return null;
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
  console.log("📅 GENERANDO FECHAS MASIVAS");

  const data = await loadCSV(INPUT);

  let generated = 0;

  const out = data.map(r => {
    const text = clean(r.nombre);

    let month = detectMonth(text) || inferMonth(text);

    if (!month) return { ...r, date_start: "", date_end: "" };

    generated++;

    return {
      ...r,
      date_start: `2026-${month}-10`,
      date_end: `2026-${month}-20`,
    };
  });

  const headers = Object.keys(out[0]);

  const csvOut = [
    headers.join(","),
    ...out.map(r =>
      headers.map(h => `"${(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT, csvOut);

  console.log("✅ Fechas generadas:", generated);
  console.log("📁 Archivo:", OUTPUT);
}

run();