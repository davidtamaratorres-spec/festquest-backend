const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const MASTER_FILE = path.join(__dirname, "..", "data", "festivales_maestro.csv");
const RULES_FILE = path.join(__dirname, "..", "data", "reglas_fechas_2026.csv");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "festivales_maestro_2026.csv");

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

function esFechaISO(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(limpiarTexto(valor));
}

function leerCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    if (!fs.existsSync(filePath)) {
      reject(new Error(`No existe el archivo: ${filePath}`));
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function run() {
  try {
    const masterRows = await leerCSV(MASTER_FILE);
    const ruleRows = await leerCSV(RULES_FILE);

    console.log(`📥 Maestro leído: ${masterRows.length}`);
    console.log(`📥 Reglas leídas: ${ruleRows.length}`);

    const rulesMap = new Map();

    for (const row of ruleRows) {
      const codigo_dane = limpiarTexto(row.codigo_dane);
      const fecha_inicio = limpiarTexto(row.fecha_inicio);
      const fecha_fin = limpiarTexto(row.fecha_fin);
      const status = limpiarTexto(row.status) || "confirmada";
      const fuente = limpiarTexto(row.fuente);

      if (!codigo_dane) continue;
      if (!esFechaISO(fecha_inicio)) continue;
      if (fecha_fin && !esFechaISO(fecha_fin)) continue;

      const key = codigo_dane;

      rulesMap.set(key, {
        fecha_inicio,
        fecha_fin: fecha_fin || fecha_inicio,
        status,
        fuente,
      });
    }

    let actualizados = 0;

    const salida = masterRows.map((row) => {
      const codigo_dane = limpiarTexto(row.codigo_dane);
      const departamento = limpiarTexto(row.departamento);
      const municipio = limpiarTexto(row.municipio);
      const festival = limpiarTexto(row.festival);
      const descripcion = limpiarTexto(row.descripcion);
      let fecha_inicio = limpiarTexto(row.fecha_inicio);
      let fecha_fin = limpiarTexto(row.fecha_fin);
      let status = limpiarTexto(row.status) || "pendiente";
      let fuente = limpiarTexto(row.fuente);

      const key = codigo_dane;
      const regla = rulesMap.get(key);

      if (regla) {
        fecha_inicio = regla.fecha_inicio;
        fecha_fin = regla.fecha_fin;
        status = regla.status || "confirmada";
        fuente = regla.fuente || fuente;
        actualizados++;
      }

      return {
        codigo_dane,
        departamento,
        municipio,
        festival,
        descripcion,
        fecha_inicio,
        fecha_fin,
        status,
        fuente,
      };
    });

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

    fs.writeFileSync(OUTPUT_FILE, [encabezado, ...lineas].join("\n"), "utf8");

    console.log(`✅ Archivo creado: ${OUTPUT_FILE}`);
    console.log(`✅ Registros actualizados con fecha: ${actualizados}`);
    console.log(`✅ Registros totales: ${salida.length}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

run();