const fs = require("fs");
const path = require("path");
const db = require("../db");

const FILE = path.join(__dirname, "..", "data", "antioquia_municipios_profile.tsv");
const DEPARTAMENTO = "Antioquia";

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toNumberRaw(v) {
  const s = String(v || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toInt(v) {
  const n = toNumberRaw(v);
  return n === null ? null : Math.round(n);
}

function toReal(v) {
  const n = toNumberRaw(v);
  return n === null ? null : n;
}

function parseTSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const header = lines[0].split("\t").map((h) => h.trim());
  const idx = (name) => header.findIndex((h) => norm(h) === norm(name));

  const iNombre = idx("Nombre");
  const iSub = idx("Subregión");
  const iAlt = idx("Altitud");
  const iTemp = idx("Temperatura");
  const iArea = idx("Área");
  const iHab = idx("Habitantes");
  const iFund = idx("Fundación");

  if ([iNombre, iSub, iAlt, iTemp, iArea, iHab, iFund].some((i) => i < 0)) {
    throw new Error(
      "Encabezado inválido. Debe contener: Nombre, Subregión, Altitud, Temperatura, Área, Habitantes, Fundación"
    );
  }

  const rows = [];
  for (let k = 1; k < lines.length; k++) {
    const cols = lines[k].split("\t");
    const nombre = (cols[iNombre] || "").trim();
    if (!nombre) continue;

    rows.push({
      nombre,
      departamento: DEPARTAMENTO,
      subregion: (cols[iSub] || "").trim() || null,
      altitud_msnm: toInt(cols[iAlt]),
      temperatura_prom: toReal(cols[iTemp]),
      area_km2: toReal(cols[iArea]),
      habitantes: toInt(cols[iHab]),
      fundacion: toInt(cols[iFund]),
      bandera_url: null,
    });
  }
  return rows;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

(async () => {
  try {
    if (!fs.existsSync(FILE)) throw new Error(`No existe el TSV: ${FILE}`);

    const text = fs.readFileSync(FILE, "utf-8");
    const incoming = parseTSV(text);

    if (incoming.length === 0) throw new Error("El TSV no tiene filas válidas.");

    console.log(`== Seed municipalities Antioquia desde TSV ==`);
    console.log(`Filas TSV: ${incoming.length}`);

    // Para evitar duplicados por tildes, consultamos existentes y comparamos por nombre normalizado
    const existing = await all(
      `SELECT id, nombre, departamento FROM municipalities WHERE departamento = ?`,
      [DEPARTAMENTO]
    );

    const byNorm = new Map(existing.map((r) => [norm(r.nombre), r]));

    let inserted = 0;
    let updated = 0;

    for (const row of incoming) {
      const key = norm(row.nombre);
      const match = byNorm.get(key);

      if (!match) {
        await run(
          `
          INSERT INTO municipalities
            (nombre, departamento, subregion, altitud_msnm, temperatura_prom, area_km2, habitantes, fundacion, bandera_url)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            row.nombre,
            row.departamento,
            row.subregion,
            row.altitud_msnm,
            row.temperatura_prom,
            row.area_km2,
            row.habitantes,
            row.fundacion,
            row.bandera_url,
          ]
        );
        inserted++;
      } else {
        // Si ya existe (porque venía de festivales), lo actualizamos con perfil
        await run(
          `
          UPDATE municipalities
          SET subregion = ?,
              altitud_msnm = ?,
              temperatura_prom = ?,
              area_km2 = ?,
              habitantes = ?,
              fundacion = ?,
              bandera_url = COALESCE(bandera_url, ?)
          WHERE id = ?
        `,
          [
            row.subregion,
            row.altitud_msnm,
            row.temperatura_prom,
            row.area_km2,
            row.habitantes,
            row.fundacion,
            row.bandera_url,
            match.id,
          ]
        );
        updated++;
      }
    }

    console.log(`✅ Seed listo`);
    console.log(`Insertados nuevos: ${inserted}`);
    console.log(`Actualizados existentes: ${updated}`);

    process.exit(0);
  } catch (e) {
    console.error("❌ Error seed:", e.message);
    process.exit(1);
  }
})();
