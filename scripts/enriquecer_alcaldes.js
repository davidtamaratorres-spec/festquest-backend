const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const INPUT = path.join(__dirname, "..", "alcaldes_colombia.csv");
const OUTPUT = path.join(__dirname, "..", "alcaldes_enriquecido.csv");

function limpiar(texto) {
  return String(texto ?? "").replace(/\s+/g, " ").trim();
}

function escaparCSV(valor) {
  const texto = limpiar(valor);
  if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function extraerCorreos(texto) {
  const matches = String(texto ?? "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map((x) => x.trim()))];
}

function extraerNombreAlcalde(texto) {
  const limpio = String(texto ?? "").replace(/\s+/g, " ").trim();

  const patrones = [
    /(?:perfil de|alcalde de|alcaldesa de|nuestro alcalde|nuestra alcaldesa|despacho del alcalde|despacho de la alcaldesa)[^A-ZÁÉÍÓÚÑ]{0,30}([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,5})/i,
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){2,5})[^.]{0,80}(?:alcalde|alcaldesa)/i,
  ];

  for (const patron of patrones) {
    const m = limpio.match(patron);
    if (m && m[1]) return limpiar(m[1]);
  }

  return "";
}

function esCorreoUtil(correo) {
  const c = String(correo || "").toLowerCase();
  if (!c) return false;
  if (c.endsWith(".png") || c.endsWith(".jpg") || c.endsWith(".jpeg") || c.endsWith(".webp")) return false;
  return true;
}

function puntuarCorreo(correo, municipio) {
  const c = String(correo || "").toLowerCase();
  const m = String(municipio || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  let score = 0;
  if (c.includes(".gov.co")) score += 10;
  if (c.includes("alcald")) score += 8;
  if (c.includes("despacho")) score += 7;
  if (c.includes("alcalde")) score += 7;
  if (c.includes("contact")) score += 4;
  if (m && c.includes(m)) score += 5;
  return score;
}

function normalizarHref(baseUrl, href) {
  if (!href) return "";
  if (href.startsWith("mailto:")) return "";
  if (href.startsWith("javascript:")) return "";
  if (href.startsWith("#")) return "";

  try {
    return new URL(href, baseUrl).href;
  } catch {
    return "";
  }
}

function esLinkRelevante(texto, href) {
  const t = String(texto || "").toLowerCase();
  const h = String(href || "").toLowerCase();

  const claves = [
    "alcalde",
    "alcaldesa",
    "nuestro alcalde",
    "nuestra alcaldesa",
    "despacho",
    "gobierno",
    "gabinete",
    "directorio",
    "contacto",
    "atencion",
    "atención",
    "administracion",
    "administración",
  ];

  return claves.some((k) => t.includes(k) || h.includes(k.replace(/\s+/g, "-")) || h.includes(k.replace(/\s+/g, "")));
}

async function descargar(url) {
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
    },
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return data;
}

async function buscarWebOficial(municipio, departamento) {
  const query = `alcaldía ${municipio} ${departamento} sitio oficial`;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

  try {
    const html = await descargar(url);
    const $ = cheerio.load(html);

    const candidatos = [];

    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const texto = limpiar($(el).text());

      if (href.includes(".gov.co")) {
        candidatos.push(href);
      }

      if (href.startsWith("http") && href.includes(".gov.co")) {
        candidatos.push(href);
      }

      const m = href.match(/https?:\/\/[^"'&\s]+\.gov\.co[^"'&\s]*/i);
      if (m) candidatos.push(m[0]);

      const textoCompleto = `${texto} ${href}`.toLowerCase();
      if (textoCompleto.includes(".gov.co")) {
        const m2 = textoCompleto.match(/https?:\/\/[^"'&\s]+\.gov\.co[^"'&\s]*/i);
        if (m2) candidatos.push(m2[0]);
      }
    });

    const limpios = [...new Set(candidatos)]
      .map((x) => x.replace(/^\/url\?q=/, "").split("&")[0])
      .filter((x) => x.includes(".gov.co"));

    return limpios[0] || "";
  } catch {
    return "";
  }
}

async function extraerDesdePagina(url, municipio) {
  try {
    const html = await descargar(url);
    const $ = cheerio.load(html);

    const bodyText = limpiar($("body").text());
    const nombre = extraerNombreAlcalde(bodyText);

    const correos = extraerCorreos(bodyText).filter(esCorreoUtil);
    correos.sort((a, b) => puntuarCorreo(b, municipio) - puntuarCorreo(a, municipio));

    const linksInternos = [];
    $("a").each((_, el) => {
      const texto = limpiar($(el).text());
      const href = $(el).attr("href") || "";
      if (esLinkRelevante(texto, href)) {
        const abs = normalizarHref(url, href);
        if (abs && abs.includes(".gov.co")) linksInternos.push(abs);
      }
    });

    return {
      nombre,
      correo: correos[0] || "",
      linksInternos: [...new Set(linksInternos)].slice(0, 10),
    };
  } catch {
    return {
      nombre: "",
      correo: "",
      linksInternos: [],
    };
  }
}

async function buscarInfoMunicipio(municipio, departamento) {
  const web = await buscarWebOficial(municipio, departamento);

  if (!web) {
    return { mandatario: "", correo: "", fuente: "" };
  }

  let mejorNombre = "";
  let mejorCorreo = "";
  let mejorFuente = web;

  const portada = await extraerDesdePagina(web, municipio);

  if (portada.nombre) mejorNombre = portada.nombre;
  if (portada.correo) mejorCorreo = portada.correo;

  if (mejorNombre && mejorCorreo) {
    return { mandatario: mejorNombre, correo: mejorCorreo, fuente: mejorFuente };
  }

  for (const link of portada.linksInternos) {
    const info = await extraerDesdePagina(link, municipio);

    if (!mejorNombre && info.nombre) {
      mejorNombre = info.nombre;
      mejorFuente = link;
    }

    if (!mejorCorreo && info.correo) {
      mejorCorreo = info.correo;
      if (!info.nombre) mejorFuente = link;
    }

    if (mejorNombre && mejorCorreo) {
      return { mandatario: mejorNombre, correo: mejorCorreo, fuente: mejorFuente };
    }
  }

  return {
    mandatario: mejorNombre,
    correo: mejorCorreo,
    fuente: mejorFuente,
  };
}

async function run() {
  if (!fs.existsSync(INPUT)) {
    console.log("❌ No existe alcaldes_colombia.csv");
    return;
  }

  const lineas = fs.readFileSync(INPUT, "utf-8").split(/\r?\n/).filter((x) => x.trim());
  const salida = ["codigo_dane,departamento,municipio,mandatario,correo,fuente"];

  for (let i = 1; i < lineas.length; i++) {
    const partes = lineas[i].split(",");

    const codigo = limpiar(partes[0]);
    const departamento = limpiar(partes[1]);
    const municipio = limpiar(partes[2]);

    if (!codigo || !departamento || !municipio) continue;

    console.log(`🔎 ${municipio} - ${departamento}`);

    const info = await buscarInfoMunicipio(municipio, departamento);

    salida.push(
      [
        escaparCSV(codigo),
        escaparCSV(departamento),
        escaparCSV(municipio),
        escaparCSV(info.mandatario),
        escaparCSV(info.correo),
        escaparCSV(info.fuente),
      ].join(",")
    );
  }

  fs.writeFileSync(OUTPUT, salida.join("\n"), "utf-8");
  console.log(`✅ Archivo generado: ${OUTPUT}`);
}

run();