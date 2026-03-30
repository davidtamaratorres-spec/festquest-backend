const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT = path.join(__dirname, "../data_std/municipios_con_festivales.csv");
const OUTPUT = path.join(__dirname, "../data_std/municipios_enrichment_hybrid.csv");

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

function normalizeText(v) {
  return clean(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildGoogleMapsSearch(query) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function buildGoogleSearch(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function buildWhatsAppGuess(municipio, departamento, tipo) {
  const q = `${tipo} en ${municipio} ${departamento} whatsapp`;
  return buildGoogleSearch(q);
}

function buildTourismName(municipio, departamento, idx) {
  if (idx === 1) return `Parque principal de ${municipio}`;
  if (idx === 2) return `Iglesia principal de ${municipio}`;
  return `Mirador turístico de ${municipio}`;
}

function buildHotelName(municipio, idx) {
  if (idx === 1) return `Hotel principal de ${municipio}`;
  if (idx === 2) return `Hostal central de ${municipio}`;
  return `Alojamiento turístico de ${municipio}`;
}

async function run() {
  console.log("🚀 PREPARANDO ENRIQUECIMIENTO HÍBRIDO");

  const data = await loadCSV(INPUT);

  const out = data.map((r) => {
    const codigo_dane = clean(r.codigo_dane);
    const municipio = normalizeText(r.municipio);
    const departamento = normalizeText(r.departamento);

    const sitio_1 = buildTourismName(municipio, departamento, 1);
    const sitio_2 = buildTourismName(municipio, departamento, 2);
    const sitio_3 = buildTourismName(municipio, departamento, 3);

    const maps_1 = buildGoogleMapsSearch(`${sitio_1}, ${municipio}, ${departamento}, Colombia`);
    const maps_2 = buildGoogleMapsSearch(`${sitio_2}, ${municipio}, ${departamento}, Colombia`);
    const maps_3 = buildGoogleMapsSearch(`${sitio_3}, ${municipio}, ${departamento}, Colombia`);

    const hotel_1 = buildHotelName(municipio, 1);
    const hotel_2 = buildHotelName(municipio, 2);
    const hotel_3 = buildHotelName(municipio, 3);

    const wa_1 = buildWhatsAppGuess(municipio, departamento, hotel_1);
    const wa_2 = buildWhatsAppGuess(municipio, departamento, hotel_2);
    const wa_3 = buildWhatsAppGuess(municipio, departamento, hotel_3);

    return {
      codigo_dane,
      municipio,
      departamento,

      sitio_1,
      maps_1,
      sitio_2,
      maps_2,
      sitio_3,
      maps_3,

      hotel_1,
      wa_1,
      hotel_2,
      wa_2,
      hotel_3,
      wa_3,

      enrichment_mode: "hybrid_seed",
      enrichment_status: "pendiente_validacion",
    };
  });

  const headers = Object.keys(out[0]);

  const csvOut = [
    headers.join(","),
    ...out.map((r) =>
      headers.map((h) => `"${String(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT, csvOut, "utf8");

  console.log("✅ Archivo generado:", out.length);
  console.log("📁 Salida:", OUTPUT);
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});