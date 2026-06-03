const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const INPUT = path.join(__dirname, "..", "alcaldes_colombia.csv");
const OUTPUT = path.join(__dirname, "..", "alcaldes_con_correos.csv");

function limpiarURL(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function extraerCorreo(texto) {
  const match = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return match ? match[0] : "";
}

async function buscarCorreoMunicipio(municipio) {
  const base = limpiarURL(municipio);

  const urls = [
    `https://www.${base}.gov.co`,
    `http://www.${base}.gov.co`,
    `https://${base}.gov.co`,
  ];

  for (const url of urls) {
    try {
      console.log("Buscando en:", url);

      const { data } = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const $ = cheerio.load(data);
      const texto = $("body").text();

      const correo = extraerCorreo(texto);

      if (correo) return correo;
    } catch (err) {
      continue;
    }
  }

  return "";
}

async function run() {
  const lineas = fs.readFileSync(INPUT, "utf-8").split("\n");

  const resultado = ["codigo_dane,departamento,municipio,mandatario,correo"];

  for (let i = 1; i < lineas.length; i++) {
    const line = lineas[i];
    if (!line.trim()) continue;

    const partes = line.split(",");

    const codigo = partes[0];
    const departamento = partes[1];
    const municipio = partes[2];

    console.log(`\n🔎 ${municipio}`);

    const correo = await buscarCorreoMunicipio(municipio);

    resultado.push(
      `${codigo},${departamento},${municipio},,${correo}`
    );
  }

  fs.writeFileSync(OUTPUT, resultado.join("\n"), "utf-8");

  console.log("\n✅ Archivo generado: alcaldes_con_correos.csv");
}

run();