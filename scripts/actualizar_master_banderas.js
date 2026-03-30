const fs = require("fs");
const path = require("path");

const MASTER_FILE = path.join(__dirname, "..", "data", "master_alimentacion.csv");

// =========================
// UTILIDADES CSV
// =========================
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function escapeCSV(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function splitLinesSafe(content) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");
}

function normalizarHeader(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function formatearCodigoDane(valor) {
  const limpio = String(valor ?? "").trim().replace(/\D/g, "");
  return limpio.padStart(5, "0").slice(-5);
}

// =========================
// MAIN
// =========================
function run() {
  if (!fs.existsSync(MASTER_FILE)) {
    console.error("❌ No existe el archivo master:", MASTER_FILE);
    process.exit(1);
  }

  const content = fs.readFileSync(MASTER_FILE, "utf8");
  const lines = splitLinesSafe(content);

  if (lines.length === 0) {
    console.error("❌ El master está vacío.");
    process.exit(1);
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const headersNormalizados = rawHeaders.map(normalizarHeader);

  const idxCodigo = headersNormalizados.indexOf("codigo_dane");
  if (idxCodigo === -1) {
    console.error("❌ No encontré la columna 'codigo_dane'.");
    process.exit(1);
  }

  let idxBandera = headersNormalizados.indexOf("bandera_jpg");

  // Si no existe bandera_jpg, la crea
  if (idxBandera === -1) {
    rawHeaders.push("bandera_jpg");
    headersNormalizados.push("bandera_jpg");
    idxBandera = rawHeaders.length - 1;
  }

  const output = [];
  output.push(rawHeaders.map(escapeCSV).join(","));

  let total = 0;
  let actualizados = 0;
  let sinCodigo = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);

    while (row.length < rawHeaders.length) {
      row.push("");
    }

    const codigo = formatearCodigoDane(row[idxCodigo]);

    if (!codigo || codigo === "00000") {
      sinCodigo++;
      output.push(row.map(escapeCSV).join(","));
      continue;
    }

    // SOLO agrega/actualiza bandera_jpg (no toca nada más)
    row[idxBandera] = `${codigo}.jpg`;

    output.push(row.map(escapeCSV).join(","));
    total++;
    actualizados++;
  }

  // Sobrescribe el MISMO archivo
  fs.writeFileSync(MASTER_FILE, output.join("\n"), "utf8");

  console.log("✅ Master actualizado");
  console.log("📄 Archivo:", MASTER_FILE);
  console.log("📌 Filas procesadas:", total);
  console.log("🖼️ Banderas asignadas:", actualizados);
  console.log("⚠️ Sin codigo_dane válido:", sinCodigo);
}

run();