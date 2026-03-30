const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const INPUT = path.join(__dirname, "../data_std/pending_festivals.csv");

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

function normalize(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCodigo(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (!d) return "";
  return d.padStart(5, "0").slice(-5);
}

function getPattern(departamento, nombreFestival) {
  const dep = normalize(departamento);
  const nombre = normalize(nombreFestival);

  // Casos especiales primero
  if (nombre.includes("feria de las flores") || nombre.includes("fiestas de medellin")) {
    return {
      date_start: "2026-08-01",
      date_end: "2026-08-10",
      year: 2026,
      rule: "especial_medellin_agosto",
    };
  }

  if (nombre.includes("carnaval")) {
    return {
      date_start: "2026-02-10",
      date_end: "2026-02-20",
      year: 2026,
      rule: "especial_carnaval_febrero",
    };
  }

  // Caribe
  if ([
    "atlantico", "bolivar", "sucre", "cordoba", "magdalena", "la guajira", "cesar", "san andres y providencia"
  ].includes(dep)) {
    return {
      date_start: "2026-02-10",
      date_end: "2026-02-20",
      year: 2026,
      rule: "caribe_febrero",
    };
  }

  // Antioquia
  if (dep === "antioquia") {
    return {
      date_start: "2026-07-10",
      date_end: "2026-07-20",
      year: 2026,
      rule: "antioquia_julio",
    };
  }

  // Altiplano centro
  if (["boyaca", "cundinamarca", "santander", "norte de santander"].includes(dep)) {
    return {
      date_start: "2026-06-20",
      date_end: "2026-06-30",
      year: 2026,
      rule: "altiplano_junio",
    };
  }

  // Eje cafetero
  if (["caldas", "risaralda", "quindio"].includes(dep)) {
    return {
      date_start: "2026-08-10",
      date_end: "2026-08-20",
      year: 2026,
      rule: "eje_agosto",
    };
  }

  // Pacífico
  if (["choco", "valle del cauca", "cauca", "narino"].includes(dep)) {
    return {
      date_start: "2026-09-10",
      date_end: "2026-09-20",
      year: 2026,
      rule: "pacifico_septiembre",
    };
  }

  // Llanos / Orinoquía
  if (["meta", "casanare", "arauca", "vichada"].includes(dep)) {
    return {
      date_start: "2026-03-10",
      date_end: "2026-03-20",
      year: 2026,
      rule: "llanos_marzo",
    };
  }

  // Amazonía-sur
  if (["amazonas", "guainia", "guaviare", "vaupes", "putumayo", "caqueta"].includes(dep)) {
    return null;
  }

  // Tolima / Huila
  if (["tolima", "huila"].includes(dep)) {
    return {
      date_start: "2026-06-15",
      date_end: "2026-06-25",
      year: 2026,
      rule: "tolima_huila_junio",
    };
  }

  return {
    date_start: "2026-07-01",
    date_end: "2026-07-10",
    year: 2026,
    rule: "fallback_julio",
  };
}

async function run() {
  console.log("🚀 APLICANDO PATRONES GLOBALES");

  const rows = await loadCSV(INPUT);

  const db = await pool.query(`
    SELECT f.id, m.codigo_dane
    FROM festivals f
    JOIN municipalities m ON m.id = f.municipio_id
  `);

  const byCodigo = new Map();
  db.rows.forEach(r => {
    byCodigo.set(normalizeCodigo(r.codigo_dane), r.id);
  });

  let leidos = 0;
  let actualizados = 0;
  let pendientesReales = 0;

  const stats = {};

  for (const r of rows) {
    leidos++;

    const codigo = normalizeCodigo(r.codigo_dane);
    const id = byCodigo.get(codigo);

    if (!id) {
      pendientesReales++;
      continue;
    }

    const pattern = getPattern(r.departamento, r.nombre);

    if (!pattern) {
      pendientesReales++;
      continue;
    }

    await pool.query(
      `
      UPDATE festivals
      SET
        date_start = $2,
        date_end = $3,
        year = $4,
        status = 'estimado',
        source_type = 'base_estimada',
        verified = false
      WHERE id = $1
      `,
      [id, pattern.date_start, pattern.date_end, pattern.year]
    );

    actualizados++;
    stats[pattern.rule] = (stats[pattern.rule] || 0) + 1;
  }

  console.log("✅ Leídos:", leidos);
  console.log("✅ Actualizados:", actualizados);
  console.log("⚠️ Pendientes reales:", pendientesReales);
  console.log("📊 Reglas aplicadas:");
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([rule, count]) => {
      console.log(`- ${rule}: ${count}`);
    });

  await pool.end();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("❌ Error:", err.message);
  await pool.end();
  process.exit(1);
});