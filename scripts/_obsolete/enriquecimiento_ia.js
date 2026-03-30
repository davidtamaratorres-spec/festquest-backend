const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const axios = require("axios");
require("dotenv").config();

const FILE = path.join(__dirname, "..", "data", "plantilla_enriquecimiento_completa.csv");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LOTE = 200;

function limpiar(v) {
  return String(v ?? "").trim();
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
  if (!rows.length) return;

  const cols = Object.keys(rows[0]);
  const header = cols.join(",") + "\n";
  const body = rows
    .map((r) => cols.map((c) => escaparCSV(r[c])).join(","))
    .join("\n");

  fs.writeFileSync(FILE, header + body, "utf8");
}

async function preguntarIA(row) {
  if (!OPENAI_API_KEY) return null;

  const prompt = `
Devuelve solo JSON válido.

Municipio: ${limpiar(row.municipio)}
Departamento: ${limpiar(row.departamento)}

Necesito el nombre del festival, feria, carnaval o fiesta principal y reconocida.

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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Responde únicamente JSON válido." },
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

    const data = JSON.parse(txt);
    return {
      festival: limpiar(data.festival),
      descripcion: limpiar(data.descripcion)
    };
  } catch {
    return null;
  }
}

async function run() {
  console.log("Cargando...");
  const rows = await cargar();

  let procesados = 0;

  for (const row of rows) {
    if (procesados >= LOTE) break;

    const municipio = limpiar(row.municipio);
    const actual = limpiar(row.festival_principal);
    const fuente = limpiar(row.fuente_datos);

    if (!municipio || municipio.toUpperCase() === "NACIONAL") continue;

    // CLAVE: si ya fue procesado antes, no repetirlo
    if (fuente === "ia" || fuente === "provisional") continue;

    // si ya tiene algo no vacío, tampoco tocarlo
    if (actual) continue;

    console.log("→", municipio);

    let nombreFinal = "";
    let descripcionFinal = "";
    let fuenteFinal = "provisional";

    const dataIA = await preguntarIA(row);

    if (dataIA && dataIA.festival) {
      nombreFinal = dataIA.festival;
      descripcionFinal = dataIA.descripcion || "";
      fuenteFinal = "ia";
    } else {
      nombreFinal = `Fiestas de ${municipio}`;
      descripcionFinal = "Nombre provisional pendiente de validación";
      fuenteFinal = "provisional";
    }

    row.festival_principal = nombreFinal;
    row.descripcion_festival = descripcionFinal;
    row.fuente_datos = fuenteFinal;
    row.estado_enriquecimiento = fuenteFinal === "ia" ? "parcial" : "pendiente_revision";
    row.observaciones = fuenteFinal === "ia"
      ? "cargado_por_ia"
      : "carga_provisional_por_fallo_ia";

    procesados++;
  }

  guardar(rows);

  console.log("✅ Listo. Procesados:", procesados);
}

run();