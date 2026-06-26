const { Pool } = require('pg');
const https = require('https');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

async function fetchJson(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await new Promise((resolve) => {
      const req = https.get(url, { headers: { 'User-Agent': 'FestQuestBot/1.0' }, timeout: 12000 }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    if (result !== null) return result;
    if (attempt < retries - 1) await sleep(1500 * (attempt + 1)); // 1.5s, 3s backoff
  }
  return null;
}

// Busca un archivo en Wikimedia Commons y devuelve su URL thumbnail
async function searchCommons(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json`;
  const data = await fetchJson(url);
  if (!data?.query?.search?.length) return null;

  // Tomar el primer resultado
  const title = data.query.search[0].title; // "File:Escudo de Medellin.svg"
  return await getFileUrl(title);
}

async function getFileUrl(fileTitle) {
  if (!fileTitle) return null;
  const cleanName = fileTitle.replace(/^(File|Archivo):/, '');
  const encoded = encodeURIComponent(cleanName);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encoded}&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json`;
  const d = await fetchJson(url);
  if (!d?.query?.pages) return null;
  const p = Object.values(d.query.pages)[0];
  return p?.imageinfo?.[0]?.thumburl || null;
}

async function getWikiImages(municipio, departamento) {
  const normMun = normalize(municipio);

  // Busca escudo en Commons: varios formatos de query
  const escudoQueries = [
    `escudo ${municipio}`,
    `escudo de ${municipio}`,
    `coat of arms ${municipio}`,
  ];

  const banderaQueries = [
    `bandera ${municipio}`,
    `flag of ${municipio}`,
    `flag ${municipio} ${departamento}`,
  ];

  let escudoUrl = null, banderaUrl = null;

  for (const q of escudoQueries) {
    const url = await searchCommonsFiltered(q, normMun, 'escudo|coat');
    if (url) { escudoUrl = url; break; }
    await sleep(300);
  }

  for (const q of banderaQueries) {
    const url = await searchCommonsFiltered(q, normMun, 'bandera|flag');
    if (url) { banderaUrl = url; break; }
    await sleep(300);
  }

  return { escudo: escudoUrl, bandera: banderaUrl };
}

// Busca en Commons y filtra por nombre del municipio + keyword
async function searchCommonsFiltered(query, normMun, keywordPattern) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=${encodeURIComponent(query)}&srlimit=8&format=json`;
  const data = await fetchJson(url);
  if (!data?.query?.search?.length) return null;

  const regex = new RegExp(keywordPattern, 'i');

  for (const result of data.query.search) {
    const normTitle = normalize(result.title);
    // El título debe contener el nombre del municipio Y la keyword
    if (normTitle.includes(normMun) && regex.test(result.title)) {
      return await getFileUrl(result.title);
    }
  }
  return null;
}

async function run() {
  const { rows } = await pool.query(`
    SELECT DISTINCT m.id, m.nombre, m.departamento
    FROM municipalities m
    INNER JOIN festivals f ON f.municipio_id = m.id
    WHERE m.escudo_url IS NULL OR m.bandera_url IS NULL
    ORDER BY m.nombre
  `);

  console.log(`Buscando imágenes para ${rows.length} municipios con festivales...`);
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`[${i+1}/${rows.length}] ${row.nombre}, ${row.departamento}`);

    try {
      const { escudo, bandera } = await getWikiImages(row.nombre, row.departamento);

      if (escudo || bandera) {
        await pool.query(`
          UPDATE municipalities SET
            escudo_url = COALESCE(escudo_url, $1),
            bandera_url = COALESCE(bandera_url, $2)
          WHERE id = $3
        `, [escudo, bandera, row.id]);
        updated++;
        console.log(`  ✓ escudo:${!!escudo} bandera:${!!bandera}`);
      } else {
        console.log(`  - sin imágenes`);
      }
    } catch(e) {
      console.log(`  ✗ error: ${e.message}`);
    }

    await sleep(600);
  }

  console.log(`\nFinalizado: ${updated}/${rows.length} municipios actualizados`);
  await pool.end();
}

run();
