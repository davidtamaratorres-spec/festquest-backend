const fs = require("fs");
const path = require("path");
const db = require("../db");

const FILE = path.join(__dirname, "..", "data", "antioquia_municipios_profile.tsv");
const DEPARTAMENTO = "Antioquia";

function normName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toNumberRaw(v) {
  // soporta: "29 067", "380,64", "19,4"
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
  const idx = (name) => header.findIndex((h) => normName(h) === normName(name));

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
      subregion: (cols[iSub] || "").trim() || null,
      altitud_msnm: toInt(cols[iAlt]),
      temperatura_prom: toReal(cols[iTemp]),
      area_km2: toReal(cols[iArea]),
      habitantes: toInt(cols[iHab]),
      fundacion: toInt(cols[iFund]),
    });
  }
  return rows;
}

function getMunicipalitiesAntioquia() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, nombre FROM municipalities WHERE departamento = ?`,
      [DEPARTAMENTO],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function run(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

(async () => {
  try {
    if (!fs.existsSync(FILE)) {
      throw new Error(`No existe el archivo: ${FILE}`);
    }

    const text = fs.readFileSync(FILE, "utf-8");
    const incoming = parseTSV(text);

    const existing = await getMunicipalitiesAntioquia();
    const byNorm = new Map(existing.map((r) => [normName(r.nombre), r]));

    let updated = 0;
    let missing = 0;

    for (const row of incoming) {
      const key = normName(row.nombre);
      const match = byNorm.get(key);

      if (!match) {
        missing++;
        console.log(`⚠️ No existe en DB (Antioquia): ${row.nombre}`);
        continue;
      }

      await run(
        `
        UPDATE municipalities
        SET subregion = ?,
            altitud_msnm = ?,
            temperatura_prom = ?,
            area_km2 = ?,
            habitantes = ?,
            fundacion = ?
        WHERE id = ?
      `,
        [
          row.subregion,
          row.altitud_msnm,
          row.temperatura_prom,
          row.area_km2,
          row.habitantes,
          row.fundacion,
          match.id,
        ]
      );

      updated++;
    }

    console.log("✅ Import terminado");
    console.log(`Actualizados: ${updated}`);
    console.log(`No encontrados (en DB): ${missing}`);

    process.exit(0);
  } catch (e) {
    console.error("❌ Error import:", e.message);
    process.exit(1);
  }
})();
