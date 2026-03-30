const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DATA_DIR = path.join(__dirname, "../data");

const FILES = {
  master: "festivals_master.csv",
  reales: "festivales_reales.csv",
};

function clean(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function normalizeCodigo(value) {
  const raw = clean(value);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 5) return digits.slice(-5);
  return digits.padStart(5, "0");
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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

async function ensureSchema() {
  await pool.query(`
    ALTER TABLE festivals
    ADD COLUMN IF NOT EXISTS year INTEGER,
    ADD COLUMN IF NOT EXISTS date_start DATE,
    ADD COLUMN IF NOT EXISTS date_end DATE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmado',
    ADD COLUMN IF NOT EXISTS source_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'base',
    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `);
}

async function getMunicipalityMaps() {
  const result = await pool.query(`
    SELECT id, codigo_dane, nombre, departamento
    FROM municipalities
  `);

  const byCode = new Map();
  const byName = new Map();

  for (const row of result.rows) {
    byCode.set(String(row.codigo_dane).padStart(5, "0"), row.id);
    byName.set(normalizeText(row.nombre), row.id);
  }

  return { byCode, byName };
}

async function run() {
  try {
    console.log("🚀 CARGA FINAL DE FESTIVALES");

    await ensureSchema();

    const { byCode, byName } = await getMunicipalityMaps();

    const masterRows = await loadCSV(path.join(DATA_DIR, FILES.master));
    const realesRows = await loadCSV(path.join(DATA_DIR, FILES.reales));

    console.log("📥 Master:", masterRows.length);
    console.log("📥 Reales:", realesRows.length);

    console.log("🧹 Limpiando festivals...");
    await pool.query(`DELETE FROM festivals`);

    let insertadosMaster = 0;
    let omitidosMaster = 0;
    let insertadosReales = 0;
    let actualizadosReales = 0;
    let omitidosReales = 0;

    // 1) Cargar master
    for (const r of masterRows) {
      const codigo = normalizeCodigo(r.municipio_codigo_dane);
      const nombre = clean(r.nombre);
      const descripcion = clean(r.descripcion) || null;
      const year = clean(r.year) ? parseInt(r.year, 10) : null;
      const date_start = clean(r.date_start) || null;
      const date_end = clean(r.date_end) || null;
      const status = clean(r.status) || "por_verificar";
      const source_name = clean(r.source_name) || null;
      const source_url = clean(r.source_url) || null;

      if (!codigo || !nombre) {
        omitidosMaster++;
        continue;
      }

      const municipio_id = byCode.get(codigo);

      if (!municipio_id) {
        omitidosMaster++;
        continue;
      }

      await pool.query(
        `
        INSERT INTO festivals (
          nombre,
          fecha,
          descripcion,
          municipio_id,
          year,
          date_start,
          date_end,
          status,
          source_name,
          source_url,
          source_type,
          verified,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'base',false,true)
        `,
        [
          nombre,
          date_start || null,
          descripcion,
          municipio_id,
          year,
          date_start,
          date_end,
          status,
          source_name,
          source_url,
        ]
      );

      insertadosMaster++;
    }

    // 2) Priorizar reales
    for (const r of realesRows) {
      const municipioNombre = clean(r.municipio);
      const nombre = clean(r.nombre);
      const fecha = clean(r.fecha) || null;
      const descripcion = clean(r.descripcion) || null;

      if (!municipioNombre || !nombre) {
        omitidosReales++;
        continue;
      }

      const municipio_id = byName.get(normalizeText(municipioNombre));

      if (!municipio_id) {
        omitidosReales++;
        continue;
      }

      const existente = await pool.query(
        `
        SELECT id
        FROM festivals
        WHERE municipio_id = $1
          AND LOWER(nombre) = LOWER($2)
        LIMIT 1
        `,
        [municipio_id, nombre]
      );

      if (existente.rowCount > 0) {
        await pool.query(
          `
          UPDATE festivals
          SET fecha = $2,
              descripcion = COALESCE($3, descripcion),
              status = 'confirmado',
              source_name = 'festivales_reales.csv',
              source_url = NULL,
              source_type = 'real',
              verified = true,
              is_active = true
          WHERE id = $1
          `,
          [existente.rows[0].id, fecha, descripcion]
        );

        actualizadosReales++;
      } else {
        await pool.query(
          `
          INSERT INTO festivals (
            nombre,
            fecha,
            descripcion,
            municipio_id,
            year,
            date_start,
            date_end,
            status,
            source_name,
            source_url,
            source_type,
            verified,
            is_active
          )
          VALUES ($1,$2,$3,$4,NULL,NULL,NULL,'confirmado','festivales_reales.csv',NULL,'real',true,true)
          `,
          [nombre, fecha, descripcion, municipio_id]
        );

        insertadosReales++;
      }
    }

    console.log("✅ MASTER insertados:", insertadosMaster);
    console.log("⚠️ MASTER omitidos:", omitidosMaster);
    console.log("✅ REALES insertados:", insertadosReales);
    console.log("✅ REALES actualizados:", actualizadosReales);
    console.log("⚠️ REALES omitidos:", omitidosReales);
    console.log("✅ CARGA DE FESTIVALES COMPLETA");

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    await pool.end();
    process.exit(1);
  }
}

run();