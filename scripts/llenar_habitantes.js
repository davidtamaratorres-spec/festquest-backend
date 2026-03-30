const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const FILE_XLSX = path.join(__dirname, "..", "data", "master_alimentacion.xlsx");
const FILE_CSV = path.join(__dirname, "..", "data", "master_alimentacion.csv");
const SHEET_POBLACION = "Hoja 1";

function limpiar(v) {
  return String(v ?? "").trim();
}

function normalizar(v) {
  return limpiar(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/bogota d\.?\s*c\.?/g, "bogota")
    .replace(/distrito capital/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function aNumero(v) {
  const n = limpiar(v).replace(/[^\d]/g, "");
  if (!n) return null;
  return Number(n);
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
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

function normalizarHeader(texto) {
  return limpiar(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function run() {
  if (!fs.existsSync(FILE_XLSX)) {
    console.log("❌ No existe Excel fuente:", FILE_XLSX);
    return;
  }

  if (!fs.existsSync(FILE_CSV)) {
    console.log("❌ No existe CSV destino:", FILE_CSV);
    return;
  }

  const wb = xlsx.readFile(FILE_XLSX);

  if (!wb.Sheets[SHEET_POBLACION]) {
    console.log("❌ No existe la hoja:", SHEET_POBLACION);
    return;
  }

  // Encabezados reales en fila 3
  const poblacionRows = xlsx.utils.sheet_to_json(wb.Sheets[SHEET_POBLACION], {
    defval: "",
    range: 2,
  });

  console.log("Filas población:", poblacionRows.length);

  const mapaHabitantes = new Map();

  for (const row of poblacionRows) {
    const municipio = normalizar(row["Municipio"]);
    const habitantes =
      aNumero(row["Población Total"]) ||
      aNumero(row["Poblacion Total"]) ||
      aNumero(row["habitantes"]);

    if (!municipio || !habitantes) continue;

    mapaHabitantes.set(municipio, habitantes);
  }

  const content = fs.readFileSync(FILE_CSV, "utf8");
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (!lines.length) {
    console.log("❌ El CSV está vacío");
    return;
  }

  const headers = parseCSVLine(lines[0]);
  const headersNorm = headers.map(normalizarHeader);

  const idxMunicipio = headersNorm.indexOf("municipio");
  if (idxMunicipio === -1) {
    console.log("❌ No encontré columna 'municipio' en el CSV");
    return;
  }

  let idxHabitantes = headersNorm.indexOf("habitantes");

  if (idxHabitantes === -1) {
    headers.push("habitantes");
    headersNorm.push("habitantes");
    idxHabitantes = headers.length - 1;
  }

  const output = [];
  output.push(headers.map(escapeCSV).join(","));

  let cargados = 0;
  let yaTenian = 0;
  let sinMatch = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);

    while (row.length < headers.length) {
      row.push("");
    }

    const municipio = normalizar(row[idxMunicipio]);
    const valorActual = limpiar(row[idxHabitantes]);

    if (valorActual !== "") {
      yaTenian++;
      output.push(row.map(escapeCSV).join(","));
      continue;
    }

    const valor = mapaHabitantes.get(municipio);

    if (valor) {
      row[idxHabitantes] = String(valor);
      cargados++;
    } else {
      sinMatch++;
    }

    output.push(row.map(escapeCSV).join(","));
  }

  fs.writeFileSync(FILE_CSV, output.join("\n"), "utf8");

  console.log("✅ terminado");
  console.log("📄 CSV actualizado:", FILE_CSV);
  console.log("✔ cargados:", cargados);
  console.log("⏭️ ya tenían:", yaTenian);
  console.log("⚠️ sin match:", sinMatch);
}

run();