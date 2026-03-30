const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");
const csv = require("csv-parser");

const MASTER_FILE = path.join(__dirname, "..", "data", "master_alimentacion.csv");
const OUTPUT_DIR = path.join(__dirname, "..", "assets", "banderas");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function limpiar(v) {
  return String(v ?? "").trim();
}

function codigoDane5(v) {
  return limpiar(v).replace(/\D/g, "").padStart(5, "0").slice(-5);
}

function normalizar(t) {
  return limpiar(t)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 🔥 Query optimizada SOLO para Colombia
async function getFlags() {
  const query = `
  SELECT ?label ?flag WHERE {
    ?item wdt:P17 wd:Q739;
          wdt:P31/wdt:P279* wd:Q515.
    OPTIONAL { ?item wdt:P41 ?flag. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es". }
  }`;

  const res = await axios.get("https://query.wikidata.org/sparql", {
    params: { query, format: "json" },
    headers: { "User-Agent": "FestQuest/1.0" },
    timeout: 30000,
  });

  const map = {};

  for (const r of res.data.results.bindings) {
    const name = normalizar(r.label?.value);
    const flag = r.flag?.value;

    if (name && flag) {
      map[name] = flag;
    }
  }

  return map;
}

async function download(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
  });

  return Buffer.from(res.data);
}

async function run() {
  console.log("🚀 cargando flags desde wikidata...");
  const flags = await getFlags();

  console.log("✔ encontrados:", Object.keys(flags).length);

  const rows = [];

  fs.createReadStream(MASTER_FILE)
    .pipe(csv())
    .on("data", (r) => rows.push(r))
    .on("end", async () => {
      let ok = 0;
      let fail = 0;

      for (let i = 0; i < rows.length; i++) {
        const codigo = codigoDane5(rows[i].codigo_dane);
        const municipio = normalizar(rows[i].municipio);

        const out = path.join(OUTPUT_DIR, `${codigo}.jpg`);

        if (fs.existsSync(out)) continue;

        const url = flags[municipio];

        if (!url) {
          console.log(`⚠️ ${municipio}`);
          fail++;
          continue;
        }

        try {
          const buffer = await download(url);

          await sharp(buffer)
            .flatten({ background: "#fff" })
            .jpeg({ quality: 90 })
            .toFile(out);

          console.log(`✔ ${municipio}`);
          ok++;
        } catch {
          console.log(`✖ ${municipio}`);
          fail++;
        }

        await sleep(100);
      }

      console.log("✅ terminado");
      console.log("✔ OK:", ok);
      console.log("⚠️ FAIL:", fail);
    });
}

run();