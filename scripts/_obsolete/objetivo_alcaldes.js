const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const INPUT = path.join(__dirname, "..", "alcaldes_colombia.csv");
const OUTPUT = path.join(__dirname, "..", "alcaldes_colombia_final.csv");

function limpiar(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}

function extraerCorreos(texto) {
  return [...new Set(
    (texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
  )];
}

function extraerNombre(texto) {
  const match = texto.match(
    /(alcalde|alcaldesa)[^\n]{0,80}([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})/i
  );
  return match ? limpiar(match[2]) : "";
}

async function buscarWeb(municipio, departamento) {
  try {
    const q = `alcaldia ${municipio} ${departamento} sitio oficial`;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}`;

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);

    const links = $("a")
      .map((i, el) => $(el).attr("href"))
      .get()
      .filter(h => h && h.includes(".gov.co"));

    return links[0] || "";
  } catch {
    return "";
  }
}

async function scrapear(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000
    });

    const texto = cheerio.load(data)("body").text();

    return {
      nombre: extraerNombre(texto),
      correo: extraerCorreos(texto)[0] || ""
    };

  } catch {
    return { nombre: "", correo: "" };
  }
}

async function run() {

  const lineas = fs.readFileSync(INPUT, "utf-8").split("\n");

  const out = ["codigo_dane,departamento,municipio,mandatario,correo,fuente"];

  for (let i = 1; i < lineas.length; i++) {

    const l = lineas[i];
    if (!l.trim()) continue;

    const [codigo, departamento, municipio] = l.split(",");

    console.log("🔎", municipio);

    const web = await buscarWeb(municipio, departamento);

    let nombre = "";
    let correo = "";

    if (web) {
      const data = await scrapear(web);
      nombre = data.nombre;
      correo = data.correo;
    }

    out.push(
      `${codigo},${departamento},${municipio},${nombre},${correo},${web}`
    );
  }

  fs.writeFileSync(OUTPUT, out.join("\n"), "utf-8");

  console.log("✅ LISTO: alcaldes_colombia_final.csv");
}

run();