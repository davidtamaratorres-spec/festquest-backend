const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const BASE_DIR = path.join(__dirname, "..", "data");
const OBS = path.join(BASE_DIR, "_obsolete");

// BASE REAL (ESTE SÍ TIENE HABITANTES)
const MUNICIPIOS_FILE = path.join(OBS, "datos_nacionales_base.csv");

const SUBREGION_FILE = path.join(OBS, "datos_nacionales_subregion.csv");
const CLIMA_FILE = path.join(OBS, "datos_nacionales_clima.csv");
const GEO_FILE = path.join(OBS, "datos_nacionales_geo.csv");

const FESTIVALES_FILE = path.join(BASE_DIR, "festivales_maestro_2026.csv");
const ALCALDES_FILE = path.join(BASE_DIR, "alcaldes_colombia_actualizado.csv");

const OUTPUT_FILE = path.join(BASE_DIR, "master_alimentacion.csv");

const municipiosMap = new Map();
const subregionMap = new Map();
const climaMap = new Map();
const geoMap = new Map();
const alcaldesMap = new Map();

function norm(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/d\.?c\.?/g, "")
    .replace(/\./g, "")
    .replace(/municipio de /g, "")
    .replace(/municipio /g, "")
    .replace(/ciudad /g, "")
    .trim();
}

function keyFrom(dep, mun) {
  let m = norm(mun);
  if (m.includes("bogota")) m = "bogota";
  return `${norm(dep)}|${m}`;
}

function safe(v) {
  return String(v ?? "").trim();
}

function getCodigoDane(row) {
  const raw = row.codigo_dane || row.codigo || row.Codigo_id || row.codigo_id;
  if (!raw) return "";
  return String(raw).padStart(5, "0");
}

function readCsv(file) {
  return new Promise((res, rej) => {
    const rows = [];
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (r) => rows.push(r))
      .on("end", () => res(rows))
      .on("error", rej);
  });
}

function writeCsv(file, rows, headers) {
  const lines = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => {
        const val = String(r[h] ?? "");
        return val.includes(",") ? `"${val}"` : val;
      }).join(",")
    )
  ];
  fs.writeFileSync(file, lines.join("\n"), "utf8");
}

async function main() {
  const municipios = await readCsv(MUNICIPIOS_FILE);
  const subregiones = await readCsv(SUBREGION_FILE);
  const climas = await readCsv(CLIMA_FILE);
  const geos = await readCsv(GEO_FILE);
  const festivales = await readCsv(FESTIVALES_FILE);
  const alcaldes = await readCsv(ALCALDES_FILE);

  for (const r of subregiones) {
    subregionMap.set(keyFrom(r.departamento, r.municipio), safe(r.subregion));
  }

  for (const r of climas) {
    climaMap.set(keyFrom(r.departamento, r.municipio), {
      temperatura: safe(r.temperatura_promedio),
      altura: safe(r.altura)
    });
  }

  for (const r of geos) {
    geoMap.set(keyFrom(r.departamento, r.municipio), {
      gentilicio: safe(r.gentilicio),
      bandera: safe(r.bandera_url)
    });
  }

  for (const r of alcaldes) {
    const dep = safe(r.departamento);
    let mun = safe(r.municipio);

    if (norm(mun).includes("bogota")) mun = "Bogotá D.C.";

    alcaldesMap.set(keyFrom(dep, mun), {
      alcalde: safe(r.alcalde || r.mandatario),
      correo: safe(r.correo || r.correo_alcalde)
    });
  }

  for (const r of municipios) {
    const dep = safe(r.departamento);
    const mun = safe(r.municipio || r.nombre);

    if (!dep || !mun) continue;
    if (norm(mun) === "nacional") continue;

    const k = keyFrom(dep, mun);

    const clima = climaMap.get(k) || {};
    const geo = geoMap.get(k) || {};
    let alcalde = alcaldesMap.get(k) || {};

    if (!alcalde.alcalde && norm(mun).includes("bogota")) {
      alcalde = {
        alcalde: "CARLOS FERNANDO GALÁN PACHÓN",
        correo: "contacto@bogota.gov.co"
      };
    }

    municipiosMap.set(k, {
      codigo_dane: getCodigoDane(r),
      departamento: dep,
      municipio: mun,
      subregion: subregionMap.get(k) || "",
      habitantes: safe(r.habitantes || r.poblacion),
      temperatura_promedio: clima.temperatura || "",
      altura: clima.altura || "",
      gentilicio: geo.gentilicio || "",
      bandera_url: geo.bandera || "",
      alcalde: alcalde.alcalde || "",
      correo_alcalde: alcalde.correo || ""
    });
  }

  const master = [];

  for (const f of festivales) {
    const dep = safe(f.departamento);
    let mun = safe(f.municipio);

    if (norm(mun).includes("bogota")) mun = "Bogotá D.C.";

    const k = keyFrom(dep, mun);
    const base = municipiosMap.get(k) || {
      codigo_dane: getCodigoDane(f),
      departamento: dep,
      municipio: mun,
      subregion: "",
      habitantes: "",
      temperatura_promedio: "",
      altura: "",
      gentilicio: "",
      bandera_url: "",
      alcalde: "",
      correo_alcalde: ""
    };

    master.push({
      ...base,
      festival: safe(f.festival || f.nombre),
      fecha: safe(f.fecha || f.fecha_inicio),
      descripcion_festival: safe(f.descripcion),
      significado_festival: "",
      sitio_1: safe(f.sitio_1),
      maps_1: safe(f.maps_1),
      sitio_2: safe(f.sitio_2),
      maps_2: safe(f.maps_2),
      sitio_3: safe(f.sitio_3),
      maps_3: safe(f.maps_3),
      hotel_1: safe(f.hotel_1),
      wa_1: safe(f.wa_1),
      hotel_2: safe(f.hotel_2),
      wa_2: safe(f.wa_2),
      hotel_3: safe(f.hotel_3),
      wa_3: safe(f.wa_3)
    });
  }

  for (const m of municipiosMap.values()) {
    if (!master.some(r => r.codigo_dane === m.codigo_dane)) {
      master.push({
        ...m,
        festival: "",
        fecha: "",
        descripcion_festival: "",
        significado_festival: "",
        sitio_1: "",
        maps_1: "",
        sitio_2: "",
        maps_2: "",
        sitio_3: "",
        maps_3: "",
        hotel_1: "",
        wa_1: "",
        hotel_2: "",
        wa_2: "",
        hotel_3: "",
        wa_3: ""
      });
    }
  }

  const headers = [
    "codigo_dane","departamento","municipio","subregion","habitantes",
    "temperatura_promedio","altura","gentilicio","bandera_url",
    "alcalde","correo_alcalde","festival","fecha",
    "descripcion_festival","significado_festival",
    "sitio_1","maps_1","sitio_2","maps_2","sitio_3","maps_3",
    "hotel_1","wa_1","hotel_2","wa_2","hotel_3","wa_3"
  ];

  writeCsv(OUTPUT_FILE, master, headers);

  console.log("MASTER OK");
  console.log("Municipios:", municipiosMap.size);
  console.log("Filas:", master.length);
}

main();