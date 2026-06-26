const { Pool } = require('pg');
const https = require('https');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await new Promise((resolve) => {
      const req = https.get(url, {
        headers: { 'User-Agent': 'FestQuestBot/1.0 (festquest.app)' },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    if (result !== null) return result;
    if (attempt < retries - 1) await sleep(1500 * (attempt + 1));
  }
  return null;
}

function checkImageSize(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: { 'User-Agent': 'FestQuestBot/1.0' },
      timeout: 6000
    }, (res) => {
      let size = 0;
      res.on('data', c => {
        size += c.length;
        if (size > 800) { res.destroy(); resolve(true); }
      });
      res.on('end', () => resolve(size > 800));
    }).on('error', () => resolve(false)).on('timeout', () => resolve(false));
  });
}

// Intentar varias búsquedas hasta encontrar la página correcta de Colombia
async function fetchWikiPage(municipio, departamento) {
  // Wikipedia ES usa solo el nombre del municipio, nunca "Municipio, Departamento"
  const candidates = [
    municipio,
    `${municipio} (Colombia)`,
    `${municipio} (${departamento})`,
  ];

  for (const title of candidates) {
    const enc = encodeURIComponent(title);
    // Pedir extract e imágenes por separado para evitar truncamiento
    const dImg = await fetchJson(
      `https://es.wikipedia.org/w/api.php?action=query&titles=${enc}&prop=images&imlimit=50&format=json`
    );
    const dExt = await fetchJson(
      `https://es.wikipedia.org/w/api.php?action=query&titles=${enc}&prop=extracts&exintro=1&explaintext=1&exsentences=3&format=json`
    );

    const ids = Object.keys(dImg?.query?.pages || {});
    if (!ids.length || ids[0] === '-1') continue;

    const page = Object.values(dImg.query.pages)[0];
    const extPage = Object.values(dExt?.query?.pages || {})[0];
    const extract = (extPage?.extract || page.extract || '').toLowerCase();

    const dpto = departamento.toLowerCase().replace(/\s+de\s+/g, ' ').replace(/archipiélago de\s*/i, '').trim();
    const esColombia =
      extract.includes('colombia') ||
      extract.includes(dpto) ||
      extract.includes('municipio') ||
      extract.includes('corregimiento');

    if (esColombia) return page;
    // si la página existe pero no pasa validación, probamos el siguiente candidato
  }
  return null;
}

async function getThumbUrl(fileTitle) {
  if (!fileTitle) return null;
  const enc = encodeURIComponent(fileTitle.replace(/^(File:|Archivo:|Imagen:)/i, ''));
  const d = await fetchJson(
    `https://es.wikipedia.org/w/api.php?action=query&titles=File:${enc}&prop=imageinfo&iiprop=url&iiurlwidth=200&format=json`
  );
  const p = Object.values(d?.query?.pages || {})[0];
  const url = p?.imageinfo?.[0]?.thumburl;
  if (!url) return null;
  const valid = await checkImageSize(url);
  return valid ? url : null;
}

async function getVerifiedImages(municipio, departamento) {
  const page = await fetchWikiPage(municipio, departamento);
  if (!page) return { escudo: null, bandera: null };

  const images = page.images || [];
  let escudoFile = null, banderaFile = null;

  for (const img of images) {
    const name = img.title.toLowerCase();
    if (!escudoFile && (name.includes('escudo') || name.includes('coat_of_arms') || name.includes('escudo_de')))
      escudoFile = img.title;
    if (!banderaFile && (name.includes('bandera') || name.includes('flag of') || name.includes('flag_of')))
      banderaFile = img.title;
  }

  const [escudo, bandera] = await Promise.all([
    getThumbUrl(escudoFile),
    getThumbUrl(banderaFile),
  ]);

  return { escudo, bandera };
}

async function run() {
  await pool.query(`
    UPDATE municipalities
    SET escudo_url = NULL, bandera_url = NULL
    WHERE id IN (SELECT DISTINCT municipio_id FROM festivals)
  `);
  console.log('Imágenes anteriores limpiadas. Re-enriqueciendo con validación Colombia...\n');

  const { rows } = await pool.query(`
    SELECT DISTINCT m.id, m.nombre, m.departamento
    FROM municipalities m
    INNER JOIN festivals f ON f.municipio_id = m.id
    ORDER BY m.nombre
  `);

  console.log(`Total municipios con festivales: ${rows.length}`);
  let updated = 0, sinImagen = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i+1}/${rows.length}] ${row.nombre}, ${row.departamento}... `);

    try {
      const { escudo, bandera } = await getVerifiedImages(row.nombre, row.departamento);

      if (escudo || bandera) {
        await pool.query(
          'UPDATE municipalities SET escudo_url = $1, bandera_url = $2 WHERE id = $3',
          [escudo, bandera, row.id]
        );
        updated++;
        console.log(`✓ escudo:${!!escudo} bandera:${!!bandera}`);
      } else {
        sinImagen++;
        console.log(`-`);
      }
    } catch(e) {
      console.log(`✗ ${e.message}`);
    }

    await sleep(500);
  }

  const { rows: stats } = await pool.query(`
    SELECT COUNT(escudo_url) as escudos, COUNT(bandera_url) as banderas
    FROM municipalities
    WHERE id IN (SELECT DISTINCT municipio_id FROM festivals)
  `);

  console.log(`\n═══ RESUMEN FINAL ═══`);
  console.log(`Municipios actualizados: ${updated}`);
  console.log(`Sin imagen en Wikipedia: ${sinImagen}`);
  console.log(`Escudos en BD: ${stats[0].escudos}`);
  console.log(`Banderas en BD: ${stats[0].banderas}`);

  await pool.end();
}

run();
