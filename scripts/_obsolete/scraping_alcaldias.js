const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT_FILE = path.join(__dirname, "..", "municipios.csv");
const OUTPUT_FILE = path.join(__dirname, "..", "alcaldes_colombia.csv");

function limpiar(texto) {
  return String(texto ?? "").replace(/\s+/g, " ").trim();
}

function limpiarHeader(texto) {
  return limpiar(texto)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escaparCSV(valor) {
  const texto = limpiar(valor);
  if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function leerMunicipios() {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(INPUT_FILE)
      .pipe(
        csv({
          mapHeaders: ({ header }) => limpiarHeader(header),
        })
      )
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

async function run() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      console.log("❌ No existe municipios.csv en la raíz");
      return;
    }

    const rows = await leerMunicipios();

    if (!rows.length) {
      console.log("❌ CSV vacío o mal leído");
      return;
    }

    console.log("Total filas leídas:", rows.length);

    const resultados = [];

    for (const row of rows) {
      const codigo = limpiar(
        row.codigo_dane ||
        row.codigo ||
        row.codigo_id ||
        row.id_provisional
      );

      const departamento = limpiar(row.departamento);

      const municipio = limpiar(
        row.municipio ||
        row.nombre ||
        row.subregion
      );

      if (!codigo || !departamento || !municipio) continue;

      resultados.push({
        codigo_dane: codigo,
        departamento,
        municipio,
        mandatario: "",
        correo: "",
      });
    }

    const header = "codigo_dane,departamento,municipio,mandatario,correo\n";

    const filas = resultados
      .map((r) =>
        [
          escaparCSV(r.codigo_dane),
          escaparCSV(r.departamento),
          escaparCSV(r.municipio),
          "",
          "",
        ].join(",")
      )
      .join("\n");

    fs.writeFileSync(OUTPUT_FILE, header + filas, "utf-8");

    console.log("✅ Archivo generado:", OUTPUT_FILE);
    console.log("✅ Registros generados:", resultados.length);

  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

run();