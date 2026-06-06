/**
 * buscarEscudos.js
 *
 * Busca el escudo (coat of arms) de cada municipio en Wikipedia ES
 * y guarda la URL de Wikimedia Commons en municipalities.escudo_url
 *
 * Uso:
 *   node buscarEscudos.js             → DRY RUN
 *   node buscarEscudos.js --apply     → escribe en BD
 *   node buscarEscudos.js --id 11550  → solo un municipio
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN = !process.argv.includes('--apply');
const ONLY_ID = (() => { const i = process.argv.indexOf('--id'); return i !== -1 ? parseInt(process.argv[i+1],10) : null; })();
const DELAY   = 1500; // ms entre llamadas WP (respetar rate limit)
const sleep   = ms => new Promise(r => setTimeout(r, ms));

const WP_API = 'https://es.wikipedia.org/w/api.php';

function cleanWiki(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\|\]]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/'''|''|&nbsp;/g, '')
    .trim();
}

function getField(content, ...aliases) {
  for (const alias of aliases) {
    const re = new RegExp(`\\|\\s*${alias}\\s*=\\s*([^\\|\\}\\n\\r]{1,250})`, 'i');
    const m  = content.match(re);
    if (m) { const v = cleanWiki(m[1]); if (v.length > 0 && v.length < 120) return v; }
  }
  return null;
}

function wikiFileUrl(filename) {
  if (!filename) return null;
  const clean = filename
    .replace(/^(File:|Archivo:|Image:|Escudo:|Coat_of_arms:)/i, '')
    .trim();
  if (!clean || clean.length < 3) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${
    encodeURIComponent(clean.replace(/ /g, '_'))
  }`;
}

async function fetchEscudo(nombre, departamento) {
  const queries = [
    `${nombre}, ${departamento}`,
    `${nombre} (municipio)`,
    nombre,
  ];

  for (const q of queries) {
    try {
      const { data: s } = await axios.get(WP_API, {
        params: { action:'query', list:'search', srsearch:q, srlimit:5, format:'json', utf8:1 },
        timeout: 10000,
        headers: { 'User-Agent': 'FestQuest/1.0 contact@festquest.app' },
      });
      const hits = (s?.query?.search || []).filter(h => {
        const t = h.title.toLowerCase();
        return t.includes(nombre.toLowerCase().split(' ')[0]) &&
               !t.includes('desambiguación') && !t.includes('provincia');
      });
      if (!hits.length) continue;

      const { data: p } = await axios.get(WP_API, {
        params: { action:'query', prop:'revisions', titles:hits[0].title,
                  rvprop:'content', rvslots:'main', format:'json', utf8:1 },
        timeout: 12000,
        headers: { 'User-Agent': 'FestQuest/1.0 contact@festquest.app' },
      });
      const pages = p?.query?.pages || {};
      const pid   = Object.keys(pages)[0];
      if (!pid || pid === '-1') continue;
      const content = pages[pid]?.revisions?.[0]?.slots?.main?.['*'] || '';
      if (content.length < 300) continue;

      // Campos del escudo en la infobox
      const raw = getField(content,
        'escudo',          // campo más común en municipios CO
        'imagen_escudo',
        'coat_of_arms',
        'escudo_image',
        'shield',
      );

      if (raw && /\.(png|jpg|svg|jpeg|PNG|JPG|SVG)/i.test(raw)) {
        const url = wikiFileUrl(raw);
        if (url) return url;
      }
      break; // artículo encontrado pero sin escudo — no seguir buscando
    } catch { /* continuar */ }
    await sleep(200);
  }
  return null;
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  buscarEscudos.js — Wikipedia Commons');
  console.log(`  Modo: ${DRY_RUN ? 'DRY RUN' : '🔴 APPLY'}`);
  console.log(`${'═'.repeat(60)}\n`);

  const scope = ONLY_ID
    ? `WHERE id = ${ONLY_ID} AND escudo_url IS NULL`
    : `WHERE escudo_url IS NULL AND id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)`;

  const { rows } = await pool.query(
    `SELECT id, nombre, departamento FROM municipalities ${scope} ORDER BY nombre ASC`
  );

  console.log(`  ${rows.length} municipios sin escudo_url\n`);

  let found = 0, notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const m = rows[i];
    process.stdout.write(`  [${String(i+1).padStart(3)}/${rows.length}] ${m.nombre.padEnd(28)} `);

    const url = await fetchEscudo(m.nombre, m.departamento);
    await sleep(DELAY);

    if (!url) {
      console.log('—');
      notFound++;
      continue;
    }

    console.log(url.slice(0, 70) + '…');
    found++;

    if (!DRY_RUN) {
      await pool.query(
        'UPDATE municipalities SET escudo_url = $1, fecha_actualizacion = NOW() WHERE id = $2',
        [url, m.id]
      ).catch(e => console.log(`    ❌ BD: ${e.message}`));
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ Escudos encontrados: ${found}`);
  console.log(`  —  Sin escudo en WP:   ${notFound}`);
  if (DRY_RUN) console.log('  ℹ️  DRY RUN — sin cambios en BD');
  console.log(`${'═'.repeat(60)}\n`);

  await pool.end();
}

main().catch(e => { console.error('\n❌', e.message); pool.end(); process.exit(1); });
