/**
 * buscarFotosEventos.js
 *
 * Busca foto representativa para cada festival y sitio turístico:
 *
 *   festivals.foto_url:
 *     1. Wikipedia ES → imagen principal del artículo del festival
 *     2. Unsplash API → foto de municipio/departamento como fallback
 *
 *   municipalities.sitio_1/2/3 → fotos vía Google Places API:
 *     - Busca cada sitio en Places, obtiene photo_reference
 *     - Construye URL de foto de Places
 *     (Guardadas en NEW cols: foto_sitio_1, foto_sitio_2, foto_sitio_3)
 *
 * Uso:
 *   node buscarFotosEventos.js              → DRY RUN festivales
 *   node buscarFotosEventos.js --apply      → escribe en BD
 *   node buscarFotosEventos.js --sitios     → incluye fotos de sitios (Google Places)
 *   node buscarFotosEventos.js --id 42      → solo festival ID 42
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool       = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN    = !process.argv.includes('--apply');
const DO_SITIOS  = process.argv.includes('--sitios');
const ONLY_ID    = (() => { const i = process.argv.indexOf('--id'); return i !== -1 ? parseInt(process.argv[i+1],10) : null; })();
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || null;
const sleep      = ms => new Promise(r => setTimeout(r, ms));

const WP_API = 'https://es.wikipedia.org/w/api.php';

// ── Wikipedia: imagen principal del artículo ──────────────────────────────
function wikiFileUrl(filename) {
  if (!filename || filename.length < 4) return null;
  const clean = filename.replace(/^(File:|Archivo:|Image:)/i, '').trim();
  if (!clean) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${
    encodeURIComponent(clean.replace(/ /g, '_'))
  }`;
}

async function fetchFotoWikipedia(nombre, municipio, departamento) {
  const queries = [
    `Festival ${nombre}`,
    `${nombre} Colombia`,
    nombre,
  ];

  for (const q of queries) {
    try {
      // Búsqueda
      const { data: s } = await axios.get(WP_API, {
        params: { action:'query', list:'search', srsearch:q, srlimit:5, format:'json', utf8:1 },
        timeout: 8000,
        headers: { 'User-Agent': 'FestQuest/1.0 contact@festquest.app' },
      });
      const hits = (s?.query?.search || []).filter(h =>
        !h.title.toLowerCase().includes('desambiguación')
      );
      if (!hits.length) continue;

      // Obtener imágenes del artículo (propiedad pageimages da la imagen principal)
      const { data: p } = await axios.get(WP_API, {
        params: {
          action:'query', prop:'pageimages|revisions',
          titles: hits[0].title,
          piprop: 'original',
          rvprop: 'content', rvslots: 'main',
          format:'json', utf8:1,
        },
        timeout: 12000,
        headers: { 'User-Agent': 'FestQuest/1.0 contact@festquest.app' },
      });
      const pages   = p?.query?.pages || {};
      const pid     = Object.keys(pages)[0];
      if (!pid || pid === '-1') continue;
      const page    = pages[pid];

      // Imagen principal (thumbnail original de Wikipedia)
      if (page.original?.source) {
        const url = page.original.source;
        // Filtrar iconos pequeños y flags
        if (!url.includes('Flag') && !url.includes('Bandera') && !url.includes('Coat') &&
            !url.includes('escudo') && !url.includes('.svg') &&
            (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.JPG'))) {
          return url;
        }
      }

      // Fallback: buscar primera imagen en el wikitext
      const content = page?.revisions?.[0]?.slots?.main?.['*'] || '';
      if (content.length > 500) {
        const imgMatch = content.match(/\[\[(?:File|Archivo|Image):([^\|\]]+\.(?:jpg|jpeg|png|JPG|JPEG|PNG))/i);
        if (imgMatch) {
          const url = wikiFileUrl(imgMatch[1]);
          if (url && !imgMatch[1].toLowerCase().includes('flag') &&
              !imgMatch[1].toLowerCase().includes('bandera') &&
              !imgMatch[1].toLowerCase().includes('escudo')) {
            return url;
          }
        }
      }

      break; // artículo encontrado pero sin foto útil
    } catch { /* continuar */ }
    await sleep(300);
  }
  return null;
}

// ── Unsplash fallback ──────────────────────────────────────────────────────
async function fetchFotoUnsplash(query) {
  if (!UNSPLASH_KEY) return null;
  try {
    const { data } = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query, per_page: 1, orientation: 'landscape' },
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      timeout: 8000,
    });
    const photo = data?.results?.[0];
    if (!photo) return null;
    // Usar regular (1080px) como compromiso calidad/tamaño
    return photo.urls?.regular || photo.urls?.small || null;
  } catch { return null; }
}

// ── Google Places: foto de sitio turístico ────────────────────────────────
async function fetchFotoPlaces(nombreSitio, municipio, departamento) {
  if (!PLACES_KEY) return null;
  try {
    const q = `${nombreSitio} ${municipio || ''} ${departamento || ''} Colombia`.trim();
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      { params: { query: q, key: PLACES_KEY }, timeout: 10000 }
    );
    if (data.status !== 'OK') return null;
    const place = data.results?.[0];
    const ref   = place?.photos?.[0]?.photo_reference;
    if (!ref) return null;
    // URL directa (requiere API key, válida para mostrar en la app)
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${PLACES_KEY}`;
  } catch { return null; }
}

// ── Agregar columnas de fotos de sitios si no existen ────────────────────
async function ensureSitioFotoCols() {
  await pool.query(`
    ALTER TABLE municipalities
      ADD COLUMN IF NOT EXISTS foto_sitio_1 TEXT,
      ADD COLUMN IF NOT EXISTS foto_sitio_2 TEXT,
      ADD COLUMN IF NOT EXISTS foto_sitio_3 TEXT
  `);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(65)}`);
  console.log('  buscarFotosEventos.js');
  console.log(`  Modo: ${DRY_RUN ? 'DRY RUN' : '🔴 APPLY'}${DO_SITIOS?' + sitios Places':''}`);
  console.log(`${'═'.repeat(65)}\n`);

  // ── FASE 1: fotos de festivales ────────────────────────────────────────
  console.log('  📸 FASE 1: Fotos de festivales (Wikipedia + Unsplash)\n');

  const festWhere = ONLY_ID
    ? `WHERE f.id = ${ONLY_ID} AND f.foto_url IS NULL`
    : `WHERE f.foto_url IS NULL AND f.is_active IS NOT FALSE AND f.municipio_id IS NOT NULL`;

  const { rows: festivales } = await pool.query(`
    SELECT f.id, f.nombre, m.nombre AS municipio, m.departamento
    FROM festivals f
    LEFT JOIN municipalities m ON m.id = f.municipio_id
    ${festWhere}
    ORDER BY f.nombre ASC
  `);

  console.log(`  ${festivales.length} festivales sin foto_url\n`);

  let festFound = 0, festMiss = 0;

  for (let i = 0; i < festivales.length; i++) {
    const f = festivales[i];
    process.stdout.write(`  [${String(i+1).padStart(3)}/${festivales.length}] ${f.nombre.slice(0,30).padEnd(32)} `);

    let url = await fetchFotoWikipedia(f.nombre, f.municipio, f.departamento);
    await sleep(1200);

    if (!url && UNSPLASH_KEY) {
      url = await fetchFotoUnsplash(`${f.nombre} Colombia festival`);
      await sleep(500);
    }

    if (!url) {
      console.log('—');
      festMiss++;
      continue;
    }

    console.log(`wp/unsplash: ${url.slice(0, 55)}…`);
    festFound++;

    if (!DRY_RUN) {
      await pool.query(
        'UPDATE festivals SET foto_url = $1 WHERE id = $2',
        [url, f.id]
      ).catch(e => console.log(`    ❌ BD: ${e.message}`));
    }
  }

  // ── FASE 2: fotos de sitios turísticos (Google Places) ────────────────
  if (DO_SITIOS && PLACES_KEY) {
    await ensureSitioFotoCols();
    console.log('\n  📍 FASE 2: Fotos de sitios turísticos (Google Places)\n');

    const { rows: munis } = await pool.query(`
      SELECT id, nombre, departamento,
             sitio_1, sitio_2, sitio_3,
             foto_sitio_1, foto_sitio_2, foto_sitio_3
      FROM municipalities
      WHERE id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
        AND (sitio_1 IS NOT NULL OR sitio_2 IS NOT NULL OR sitio_3 IS NOT NULL)
        AND (foto_sitio_1 IS NULL OR foto_sitio_2 IS NULL OR foto_sitio_3 IS NULL)
      ORDER BY nombre ASC
    `);

    console.log(`  ${munis.length} municipios con sitios sin foto\n`);

    let sitiosFound = 0;
    for (const m of munis) {
      for (const n of [1, 2, 3]) {
        const sitio = m[`sitio_${n}`];
        if (!sitio || m[`foto_sitio_${n}`]) continue;

        process.stdout.write(`  ${m.nombre.padEnd(25)} sitio_${n}: ${sitio.slice(0,25).padEnd(28)} `);
        const url = await fetchFotoPlaces(sitio, m.nombre, m.departamento);
        await sleep(350);

        if (!url) { console.log('—'); continue; }
        console.log('✓ places');
        sitiosFound++;

        if (!DRY_RUN) {
          await pool.query(
            `UPDATE municipalities SET foto_sitio_${n} = $1 WHERE id = $2`,
            [url, m.id]
          ).catch(e => console.log(`    ❌ BD: ${e.message}`));
        }
      }
    }
    console.log(`\n  Fotos de sitios encontradas: ${sitiosFound}`);
  } else if (DO_SITIOS && !PLACES_KEY) {
    console.log('\n  ⚠️  GOOGLE_PLACES_API_KEY no definida — fase de sitios omitida');
  }

  // ── Resumen ────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(65)}`);
  console.log('  RESUMEN');
  console.log(`${'═'.repeat(65)}`);
  console.log(`  Festivales con foto encontrada: ${festFound}`);
  console.log(`  Festivales sin foto:            ${festMiss}`);
  if (!UNSPLASH_KEY) console.log('  ℹ️  UNSPLASH_ACCESS_KEY no definida — solo Wikipedia');
  if (DRY_RUN) console.log('  ℹ️  DRY RUN — sin cambios en BD');
  console.log(`${'═'.repeat(65)}\n`);

  await pool.end();
}

main().catch(e => { console.error('\n❌', e.message); pool.end(); process.exit(1); });
