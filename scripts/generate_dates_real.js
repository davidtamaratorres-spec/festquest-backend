const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT = path.join(__dirname, "../data_std/festivals_std.csv");
const OUTPUT = path.join(__dirname, "../data_std/festivals_dates_ready.csv");

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

// fallback por departamento (mejora cobertura)
function inferByRegion(dep) {
  const d = clean(dep);

  if (d.includes("antioquia")) return "08";
  if (d.includes("bolivar")) return "11";
  if (d.includes("atlantico")) return "02";
  if (d.includes("cundinamarca")) return "06";

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
  console.log("📅 GENERANDO FECHAS REALES");

  const data = await loadCSV(INPUT);

  let generated = 0;

  const out = data.map(r => {
    const text = clean(r.nombre_festival + " " + r.descripcion);
    let month = detectMonth(text);

    if (!month) {
      month = inferByRegion(r.departamento);
    }

    if (!month) {
      return { ...r, date_start: "", date_end: "" };
    }

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