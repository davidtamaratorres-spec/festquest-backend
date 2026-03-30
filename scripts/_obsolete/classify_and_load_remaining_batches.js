const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DATA_DIR = path.join(__dirname, "../data_std");

const BATCH_FILES = [
  "festivals_batch_3.csv",
  "festivals_batch_4.csv",
  "festivals_batch_5.csv",
  "festivals_batch_6.csv",
  "festivals_batch_7.csv",
];

function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    if (!fs.existsSync(filePath)) return resolve([]);
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

function getRule(departamento) {
  const dep = normalize(departamento);

  if (dep === "antioquia") {
    return {
      status: "estimado",
      source_type: "base_estimada",
      verified: false,
      date_start: "2026-07-10",
      date_end: "2026-07-20",
      year: 2026,
      rule: "antioquia_julio",
    };
  }

  if (dep === "atlantico") {
    return {
      status: "estimado",
      source_type: "base_estimada",
      verified: false,
      date_start: "2026-02-10",
      date_end: "2026-02-20",
      year: 2026,
      rule: "atlantico_febrero",
    };
  }

  if (dep === "bolivar") {
    return {
      status: "estimado",
      source_type: "base_estimada",
      verified: false,
      date_start: "2026-11-10",
      date_end: "2026-11-20",
      year: 2026,
      rule: "bolivar_noviembre",
    };
  }

  if (dep === "cundinamarca") {
    return {
      status: "estimado",
      source_type: "base_estimada",
      verified: false,
      date_start: "2026-06-10",
      date_end: "2026-06-20",
      year: 2026,
      rule: "cundinamarca_junio",
    };
  }

  return {
    status: "pendiente",
    source_type: "pendiente_externo",
    verified: false,
    date_start: null,
    date_end: null,
    year: 2026,
    rule: "sin_regla",
  };
}

async function run() {
  console.log("🚀 CLASIFICANDO Y CARGANDO LOTES RESTANTES");

  const municipioMapResult = await pool.query(`
    SELECT f.id, m.codigo_dane, m.nombre AS municipio, m.departamento
    FROM festivals f
    JOIN municipalities m ON m.id = f.municipio_id
  `);

  const byCodigo = new Map();
  for (const row of municipioMapResult.rows) {
    byCodigo.set(normalizeCodigo(row.codigo_dane), row.id);
  }

  let totalRows = 0;
  let actualizados = 0;
  let estimados = 0;
  let pendientes = 0;

  const report = [];

  for (const file of BATCH_FILES) {
    const filePath = path.join(DATA_DIR, file);
    const rows = await loadCSV(filePath);

    console.log(`📥 ${file}: ${rows.length}`);
    totalRows += rows.length;

    for (const r of rows) {
      const codigo = normalizeCodigo(r.codigo_dane);
      if (!codigo) continue;

      const festivalId = byCodigo.get(codigo);
      if (!festivalId) continue;

      const rule = getRule(r.departamento);

      await pool.query(
        `
        UPDATE festivals
        SET
          date_start = COALESCE($2, date_start),
          date_end = COALESCE($3, date_end),
          year = COALESCE($4, year),
          status = $5,
          source_type = $6,
          verified = $7
        WHERE id = $1
        `,
        [
          festivalId,
          rule.date_start,
          rule.date_end,
          rule.year,
          rule.status,
          rule.source_type,
          rule.verified,
        ]
      );

      actualizados++;

      if (rule.status === "estimado") estimados++;
      if (rule.status === "pendiente") pendientes++;

      report.push({
        codigo_dane: codigo,
        nombre: r.nombre || "",
        municipio: r.municipio || "",
        departamento: r.departamento || "",
        regla: rule.rule,
        status: rule.status,
        date_start: rule.date_start || "",
        date_end: rule.date_end || "",
      });
    }
  }

  const reportFile = path.join(DATA_DIR, "remaining_batches_classification_report.csv");
  const headers = [
    "codigo_dane",
    "nombre",
    "municipio",
    "departamento",
    "regla",
    "status",
    "date_start",
    "date_end",
  ];

  const csvOut = [
    headers.join(","),
    ...report.map(r =>
      headers.map(h => `"${String(r[h] || "").replace(/"/g, "")}"`).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(reportFile, csvOut, "utf8");

  console.log("✅ Filas leídas:", totalRows);
  console.log("✅ Actualizados:", actualizados);
  console.log("✅ Estimados:", estimados);
  console.log("⚠️ Pendientes:", pendientes);
  console.log("📁 Reporte:", reportFile);

  await pool.end();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("❌ Error:", err.message);
  await pool.end();
  process.exit(1);
});