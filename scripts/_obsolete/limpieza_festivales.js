const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const FILE = path.join(__dirname, "..", "data", "plantilla_enriquecimiento_completa.csv");

function limpiar(v) {
  return String(v ?? "").trim();
}

function normalizar(v) {
  return limpiar(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esProvisional(nombre) {
  const n = normalizar(nombre);

  return (
    n.startsWith("fiestas de") ||
    n.startsWith("festival de") ||
    n.includes("evento") ||
    n.length < 8
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

async function run() {
  console.log("Limpiando...");

  const rows = await cargar();

  let eliminados = 0;

  for (const row of rows) {
    const nombre = limpiar(row.festival_principal);

    if (!nombre) continue;

    if (esProvisional(nombre)) {
      row.festival_principal = "";
      row.descripcion_festival = "";
      row.fuente_datos = "";
      row.estado_enriquecimiento = "pendiente_revision";
      row.observaciones = "eliminado_por_generico";

      eliminados++;
    }
  }

  guardar(rows);

  console.log("✅ Limpieza terminada");
  console.log("Eliminados:", eliminados);
}

run();