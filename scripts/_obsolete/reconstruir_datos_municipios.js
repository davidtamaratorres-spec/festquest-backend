const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const DATA_DIR = path.join(__dirname, "../data");
const OUT_DIR = path.join(__dirname, "../data_std");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR);
}

const FILES = {
  base: "datos_nacionales_base.csv",
  geo: "datos_nacionales_geo.csv",
  clima: "datos_nacionales_clima.csv",
  subregion: "datos_nacionales_subregion.csv",
};

const STANDARD_COLUMNS = [
  "codigo_dane",
  "departamento",
  "municipio",
  "subregion",
  "habitantes",
  "temperatura_promedio",
  "altura",
  "festival",
  "fecha",
  "sitio_1",
  "maps_1",
  "sitio_2",
  "maps_2",
  "sitio_3",
  "maps_3",
  "hotel_1",
  "wa_1",
  "hotel_2",
  "wa_2",
  "hotel_3",
  "wa_3",
  "latitud",
  "longitud",
  "fuente_geo",
  "bandera_url",
];

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

function clean(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function normalizeCodigo(value) {
  const raw = clean(value);
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (digits === "0" || digits === "00000") return "";

  if (digits.length >= 5) {
    return digits.slice(-5);
  }

  return digits.padStart(5, "0");
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildKey(municipio, departamento) {
  return `${normalizeText(municipio)}|${normalizeText(departamento)}`;
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && clean(row[key]) !== "") {
      return clean(row[key]);
    }
  }
  return "";
}

function toStandardRow(row) {
  return {
    codigo_dane: normalizeCodigo(
      pick(row, ["codigo_dane", "Codigo_id", "codigo", "Codigo", "Código DANE"])
    ),
    departamento: pick(row, ["departamento", "Departamento", "departamento_nombre"]),
    municipio: pick(row, ["municipio", "Municipio", "nombre", "Nombre Municipio"]),
    subregion: pick(row, ["subregion", "Subregion"]),
    habitantes: pick(row, ["habitantes", "poblacion"]),
    temperatura_promedio: pick(row, ["temperatura_promedio", "temperatura"]),
    altura: pick(row, ["altura"]),
    festival: pick(row, ["festival", "nombre_festival"]),
    fecha: pick(row, ["fecha"]),
    sitio_1: pick(row, ["sitio_1"]),
    maps_1: pick(row, ["maps_1"]),
    sitio_2: pick(row, ["sitio_2"]),
    maps_2: pick(row, ["maps_2"]),
    sitio_3: pick(row, ["sitio_3"]),
    maps_3: pick(row, ["maps_3"]),
    hotel_1: pick(row, ["hotel_1"]),
    wa_1: pick(row, ["wa_1"]),
    hotel_2: pick(row, ["hotel_2"]),
    wa_2: pick(row, ["wa_2"]),
    hotel_3: pick(row, ["hotel_3"]),
    wa_3: pick(row, ["wa_3"]),
    latitud: pick(row, ["latitud"]),
    longitud: pick(row, ["longitud"]),
    fuente_geo: pick(row, ["fuente_geo"]),
    bandera_url: pick(row, ["bandera_url", "bandera"]),
  };
}

function isBasura(row) {
  const municipio = normalizeText(row.municipio);
  const departamento = normalizeText(row.departamento);

  if (!municipio || !departamento) return true;
  if (municipio === "nacional") return true;
  if (departamento === "nacional") return true;

  return false;
}

function mergePreferExisting(target, source) {
  for (const col of STANDARD_COLUMNS) {
    if (!target[col] && source[col]) {
      target[col] = source[col];
    }
  }
}

function csvEscape(value) {
  const str = clean(value).replace(/"/g, '""');
  return `"${str}"`;
}

function writeCSV(filePath, rows) {
  const lines = [
    STANDARD_COLUMNS.join(","),
    ...rows.map((row) => STANDARD_COLUMNS.map((col) => csvEscape(row[col])).join(",")),
  ];
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

async function run() {
  console.log("🚀 RECONSTRUYENDO DATOS");

  const baseRaw = await loadCSV(path.join(DATA_DIR, FILES.base));
  const geoRaw = await loadCSV(path.join(DATA_DIR, FILES.geo));
  const climaRaw = await loadCSV(path.join(DATA_DIR, FILES.clima));
  const subregionRaw = await loadCSV(path.join(DATA_DIR, FILES.subregion));

  console.log("📥 Base:", baseRaw.length);
  console.log("📥 Geo:", geoRaw.length);
  console.log("📥 Clima:", climaRaw.length);
  console.log("📥 Subregion:", subregionRaw.length);

  const baseStd = [];
  const byCode = new Map();
  const byKey = new Map();

  for (const row of baseRaw) {
    const std = toStandardRow(row);
    if (isBasura(std)) continue;

    const key = buildKey(std.municipio, std.departamento);

    if (!std.codigo_dane) {
      continue;
    }

    if (!byCode.has(std.codigo_dane)) {
      byCode.set(std.codigo_dane, { ...std });
      byKey.set(key, std.codigo_dane);
      baseStd.push(byCode.get(std.codigo_dane));
    } else {
      mergePreferExisting(byCode.get(std.codigo_dane), std);
    }
  }

  console.log("✅ Base válida:", baseStd.length);

  function rebuildSecondary(rows, sourceName) {
    const out = [];

    for (const row of rows) {
      const std = toStandardRow(row);
      if (isBasura(std)) continue;

      let code = std.codigo_dane;

      if (!code || !byCode.has(code)) {
        const key = buildKey(std.municipio, std.departamento);
        code = byKey.get(key) || "";
      }

      if (!code || !byCode.has(code)) {
        continue;
      }

      const baseRef = byCode.get(code);

      const rebuilt = {
        codigo_dane: code,
        departamento: baseRef.departamento || std.departamento,
        municipio: baseRef.municipio || std.municipio,
        subregion: std.subregion || baseRef.subregion || "",
        habitantes: std.habitantes || baseRef.habitantes || "",
        temperatura_promedio: std.temperatura_promedio || baseRef.temperatura_promedio || "",
        altura: std.altura || baseRef.altura || "",
        festival: std.festival,
        fecha: std.fecha,
        sitio_1: std.sitio_1,
        maps_1: std.maps_1,
        sitio_2: std.sitio_2,
        maps_2: std.maps_2,
        sitio_3: std.sitio_3,
        maps_3: std.maps_3,
        hotel_1: std.hotel_1,
        wa_1: std.wa_1,
        hotel_2: std.hotel_2,
        wa_2: std.wa_2,
        hotel_3: std.hotel_3,
        wa_3: std.wa_3,
        latitud: std.latitud,
        longitud: std.longitud,
        fuente_geo: std.fuente_geo || sourceName,
        bandera_url: std.bandera_url || baseRef.bandera_url || "",
      };

      out.push(rebuilt);
    }

    return out;
  }

  const geoStd = rebuildSecondary(geoRaw, "geo");
  const climaStd = rebuildSecondary(climaRaw, "clima");
  const subregionStd = rebuildSecondary(subregionRaw, "subregion");

  const masterMap = new Map();

  for (const row of baseStd) {
    masterMap.set(row.codigo_dane, {
      ...Object.fromEntries(STANDARD_COLUMNS.map((c) => [c, ""])),
      ...row,
    });
  }

  for (const dataset of [geoStd, climaStd, subregionStd]) {
    for (const row of dataset) {
      if (!masterMap.has(row.codigo_dane)) continue;
      mergePreferExisting(masterMap.get(row.codigo_dane), row);
    }
  }

  const masterRows = Array.from(masterMap.values()).sort((a, b) =>
    a.codigo_dane.localeCompare(b.codigo_dane)
  );

  writeCSV(path.join(OUT_DIR, "datos_nacionales_base_std.csv"), baseStd);
  writeCSV(path.join(OUT_DIR, "datos_nacionales_geo_std.csv"), geoStd);
  writeCSV(path.join(OUT_DIR, "datos_nacionales_clima_std.csv"), climaStd);
  writeCSV(path.join(OUT_DIR, "datos_nacionales_subregion_std.csv"), subregionStd);
  writeCSV(path.join(OUT_DIR, "municipios_master_std.csv"), masterRows);

  console.log("✅ Reconstruido: datos_nacionales_base_std.csv | filas:", baseStd.length);
  console.log("✅ Reconstruido: datos_nacionales_geo_std.csv | filas:", geoStd.length);
  console.log("✅ Reconstruido: datos_nacionales_clima_std.csv | filas:", climaStd.length);
  console.log("✅ Reconstruido: datos_nacionales_subregion_std.csv | filas:", subregionStd.length);
  console.log("✅ Reconstruido: municipios_master_std.csv | filas:", masterRows.length);
  console.log("📁 Salida: data_std");
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});