const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const axios = require("axios");
require("dotenv").config();

const FILE = path.join(__dirname, "..", "data", "plantilla_enriquecimiento_completa.csv");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LOTE = 200;

// ======================
// UTIL
// ======================

function limpiar(v) {
  return String(v ?? "").trim();
}

function normalizar(v) {
  return limpiar(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esNombreValido(n) {
  n = limpiar(n);
  if (!n) return false;
  if (n.length < 6) return false;
  if (n.split(" ").length < 2) return false;
  return true;
}

function esGenerico(nombre, municipio) {
  const n = normalizar(nombre);
  const m = normalizar(municipio);

  if (!n) return true;

  return (
    n === m ||
    n === `fiestas de ${m}` ||
    n === `festival de ${m}` ||
    n === `feria de ${m}` ||
    n === `carnaval de ${m}` ||
    n === `semana santa de ${m}` ||
    n.includes("evento principal") ||
    n.includes("evento cultural") ||
    n.includes("celebracion principal") ||
    n.includes("fiesta principal")
  );
}

function escaparCSV(valor) {
  const t = limpiar(valor);
  if (t.includes(",") || t.includes('"')) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

function cargar() {
  return new Promise((res, rej) => {
    const rows = [];
    fs.createReadStream(FILE)
      .pipe(csv())
      .on("data", (r) => rows.push(r))
      .on("end", () => res(rows))
      .on("error", rej);
  });
}

function guardar(rows) {
  const cols = Object.keys(rows[0]);
  const header = cols.join(",") + "\n";

  const body = rows
    .map((r) => cols.map((c) => escaparCSV(r[c])).join(","))
    .join("\n");

  fs.writeFileSync(FILE, header + body, "utf8");
}

// ======================
// IA
// ======================

async function preguntarIA(row) {
  const prompt = `
Devuelve JSON válido.

Necesito identificar el evento principal, real y reconocido de este municipio de Colombia.

El evento puede ser cualquiera de estos tipos:
- carnaval
- feria
- fiestas patronales
- fiestas tradicionales
- semana santa
- festival musical
- festival folclórico
- encuentro nacional de bandas
- festival de gaitas
- festival de acordeón
- festival de violinato
- corralejas
- festividad religiosa
- celebración cultural emblemática

Reglas:
- No inventes.
- No uses "Fiestas de <municipio>" si no es el nombre oficial y reconocido.
- Prioriza el evento más representativo e identitario del municipio.
- Puede ser cultural, religioso, patronal, musical o tradicional.
- Si no existe información confiable, responde null.
- El nombre debe tener al menos 2 palabras.
- Prefiere nombres oficiales o ampliamente reconocidos.

Municipio: ${limpiar(row.municipio)}, ${limpiar(row.departamento)}, Colombia

Formato:
{
  "festival": "string o null",
  "descripcion": "string o null"
}
`.trim();

  try {
    const r = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4.1-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Responde solo JSON válido. Identifica el evento principal de municipios colombianos con criterio cultural, religioso, musical, folclórico y tradicional."
          },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 60000
      }
    );

    const txt = r?.data?.choices?.[0]?.message?.content;
    if (!txt) return null;

    return JSON.parse(txt);
  } catch {
    return null;
  }
}

// ======================
// MAIN
// ======================

async function run() {
  console.log("Reprocesando limpio...");
  const rows = await cargar();

  let procesados = 0;
  let buenos = 0;
  let descartados = 0;

  for (const row of rows) {
    if (procesados >= LOTE) break;

    const actual = limpiar(row.festival_principal);

    // solo vacíos
    if (actual) continue;

    console.log("→", row.municipio);

    const data = await preguntarIA(row);

    procesados++;

    const nombre = limpiar(data?.festival);
    const descripcion = limpiar(data?.descripcion);

    if (!esNombreValido(nombre) || esGenerico(nombre, row.municipio)) {
      row.estado_enriquecimiento = "sin_datos";
      row.observaciones = "ia_descartada";
      descartados++;
      continue;
    }

    row.festival_principal = nombre;
    row.descripcion_festival = descripcion;
    row.fuente_datos = "ia";
    row.estado_enriquecimiento = "parcial";
    row.observaciones = "ia_validada";

    buenos++;
  }

  guardar(rows);

  console.log("✅ Reproceso terminado");
  console.log("Procesados:", procesados);
  console.log("Buenos:", buenos);
  console.log("Descartados:", descartados);
}

run();