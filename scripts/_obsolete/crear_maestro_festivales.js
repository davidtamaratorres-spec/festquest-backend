const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const INPUT_FILE = path.join(__dirname, "..", "data", "festivals_raw_big.csv");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "festivales_maestro.csv");

function limpiarTexto(valor) {
  return String(valor ?? "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escaparCSV(valor) {
  const texto = limpiarTexto(valor);
  if (texto.includes(",") || texto.includes('"')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ No existe el archivo de entrada: ${INPUT_FILE}`);
    process.exit(1);
  }

  const rows = [];

  fs.createReadStream(INPUT_FILE)
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", () => {
      console.log(`📥 Filas leídas: ${rows.length}`);

      const salida = [];
      const vistos = new Set();

      for (const row of rows) {
        const codigo_dane = limpiarTexto(row.codigo_dane);
        const departamento = limpiarTexto(row.departamento);
        const municipio = limpiarTexto(row.municipio);
        const festival = limpiarTexto(row.nombre);
        const descripcion = "";
        const fecha_inicio = "";
        const fecha_fin = "";
        const fuente = limpiarTexto(row.source_url || row.source_name);

        if (!codigo_dane && !departamento && !municipio && !festival) {
          continue;
        }

        const llave = [
          codigo_dane,
          departamento.toLowerCase(),
          municipio.toLowerCase(),
          festival.toLowerCase(),
        ].join("|");

        if (vistos.has(llave)) {
          continue;
        }
        vistos.add(llave);

        salida.push({
          codigo_dane,
          departamento,
          municipio,
          festival,
          descripcion,
          fecha_inicio,
          fecha_fin,
          status: "pendiente",
          fuente,
        });
      }

      const encabezado =
        "codigo_dane,departamento,municipio,festival,descripcion,fecha_inicio,fecha_fin,status,fuente";

      const lineas = salida.map((r) =>
        [
          escaparCSV(r.codigo_dane),
          escaparCSV(r.departamento),
          escaparCSV(r.municipio),
          escaparCSV(r.festival),
          escaparCSV(r.descripcion),
          escaparCSV(r.fecha_inicio),
          escaparCSV(r.fecha_fin),
          escaparCSV(r.status),
          escaparCSV(r.fuente),
        ].join(",")
      );

      const contenido = [encabezado, ...lineas].join("\n");
      fs.writeFileSync(OUTPUT_FILE, contenido, "utf8");

      console.log(`✅ Archivo creado: ${OUTPUT_FILE}`);
      console.log(`✅ Registros finales: ${salida.length}`);
    })
    .on("error", (err) => {
      console.error("❌ Error leyendo CSV:", err.message);
      process.exit(1);
    });
}

run();