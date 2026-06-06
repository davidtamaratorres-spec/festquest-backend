/**
 * completarLugares.js
 *
 * Rellena lugar_encuentro en la tabla festivals para los 363 festivales
 * que tienen ese campo vacío.
 *
 * Estrategia por orden de prioridad:
 *   1. Wikipedia ES (MediaWiki API) — busca el artículo del festival y extrae
 *      |lugar= |sede= |ubicación= del infobox
 *   2. Fallback Wikipedia → |municipio= o |ciudad= del artículo
 *   3. Fallback geográfico → "${municipio}, ${departamento}" (siempre disponible)
 *
 * Uso:
 *   node completarLugares.js                → dry-run (muestra sin escribir)
 *   node completarLugares.js --apply        → escribe en BD
 *   node completarLugares.js --id 42        → solo ese festival
 *   node completarLugares.js --limite 50    → procesa primero N festivales
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN = !process.argv.includes('--apply');
const ONLY_ID = (() => { const i = process.argv.indexOf('--id');     return i !== -1 ? parseInt(process.argv[i+1], 10) : null; })();
const LIMITE  = (() => { const i = process.argv.indexOf('--limite'); return i !== -1 ? parseInt(process.argv[i+1], 10) : 9999; })();

const D_WP  = 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WP_API = 'https://es.wikipedia.org/w/api.php';
const UA     = 'FestQuest/1.0 contact@festquest.app';

// ── Limpieza básica de wikitext ───────────────────────────────────────────
function cleanWiki(raw) {
  if (!raw) return '';
  return raw
    .replace(/<ref[^>]*>.*?<\/ref>/gis, '')
    .replace(/<ref[^/]*\/>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\|\]]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/'''|''|&nbsp;/g, '')
    .replace(/<!--.*?-->/gs, '')
    .trim();
}

function getField(content, ...aliases) {
  for (const alias of aliases) {
    const re = new RegExp(`\\|\\s*${alias}\\s*=\\s*([^\\|\\}\\n\\r]{1,200})`, 'i');
    const m  = content.match(re);
    if (m) {
      let v = cleanWiki(m[1]);
      // Limpiar wikilinks incompletos que quedaron (e.g. "Ciudad, [[Departamento")
      v = v.replace(/\[\[([^\|\]]*\|)?([^\]\|]*)\]\]?/g, '$2');
      v = v.replace(/\[{1,2}[^\]]*$/g, '').trim();  // cortar [[... sin cerrar
      v = v.replace(/\{\{[^}]*$/g, '').trim();       // cortar {{... sin cerrar
      // Quitar trailing punctuation
      v = v.replace(/[,;:\s]+$/, '').trim();
      // Descartar resultados que sean datos climáticos o no sean lugares
      if (/^\{\{|^\[\[/.test(v)) continue;
      if (/\d{4}[-–]\d{4}|normales|promedio\s+\d|mm\s*$|°[CF]\s*$/.test(v)) continue;
      if (v.length > 1 && v.length < 100) return v;
    }
  }
  return null;
}

// ── Wikipedia: buscar artículo del festival ────────────────────────────────
async function fetchLugarWikipedia(nombreFestival, municipio, departamento) {
  const queries = [
    nombreFestival,
    `${nombreFestival} ${municipio}`,
    `Festival de ${municipio}`,
  ];

  for (const q of queries) {
    try {
      const { data: s } = await axios.get(WP_API, {
        params: { action:'query', list:'search', srsearch:q, srlimit:5, format:'json', utf8:1 },
        timeout: 10000,
        headers: { 'User-Agent': UA },
      });
      const normMuni = (municipio || '').toLowerCase().split(' ')[0];
      const hits = (s?.query?.search || []).filter(h => {
        const t = h.title.toLowerCase();
        const n = nombreFestival.toLowerCase().split(' ')[0];
        // Exigir que el título incluya palabra del festival o del municipio
        // y además que parezca colombiano o no sea claramente extranjero
        const coincide = t.includes(n) || t.includes(normMuni);
        const esExtranjero = /albacete|sevilla|madrid|españa|mexico|peru|argentina/i.test(t);
        return coincide && !esExtranjero && !t.includes('desambiguación');
      });
      if (!hits.length) continue;

      const { data: p } = await axios.get(WP_API, {
        params: { action:'query', prop:'revisions', titles:hits[0].title,
                  rvprop:'content', rvslots:'main', format:'json', utf8:1 },
        timeout: 12000,
        headers: { 'User-Agent': UA },
      });
      const pages = p?.query?.pages || {};
      const pid   = Object.keys(pages)[0];
      if (!pid || pid === '-1') continue;
      const content = pages[pid]?.revisions?.[0]?.slots?.main?.['*'] || '';
      if (content.length < 300) continue;

      // Intentar extraer lugar del infobox del festival
      const lugar = getField(content,
        'lugar', 'sede', 'ubicación', 'ubicacion', 'venue',
        'ciudad', 'localidad', 'municipio'
      );
      if (lugar && lugar.length > 2) return { lugar, fuente: 'wikipedia' };
    } catch { /* sigue */ }
    await sleep(300);
  }
  return null;
}

// ── Obtener festivales a procesar ─────────────────────────────────────────
async function getFestivales() {
  if (ONLY_ID) {
    const { rows } = await pool.query(
      `SELECT f.id, f.nombre, f.lugar_encuentro,
              m.nombre AS municipio, m.departamento
       FROM festivals f
       LEFT JOIN municipalities m ON m.id = f.municipio_id
       WHERE f.id = $1`, [ONLY_ID]
    );
    return rows;
  }

  const { rows } = await pool.query(`
    SELECT f.id, f.nombre, f.lugar_encuentro,
           m.nombre AS municipio, m.departamento
    FROM festivals f
    LEFT JOIN municipalities m ON m.id = f.municipio_id
    WHERE f.lugar_encuentro IS NULL OR TRIM(f.lugar_encuentro) = ''
    ORDER BY f.nombre ASC
    LIMIT $1
  `, [LIMITE]);
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  FestQuest — completarLugares.js');
  console.log(`  ${DRY_RUN ? 'DRY RUN (sin cambios en BD)' : 'MODO APPLY'}`);
  console.log('═'.repeat(70));

  const festivales = await getFestivales();
  console.log(`\n  Festivales sin lugar_encuentro: ${festivales.length}\n`);

  if (!festivales.length) {
    console.log('  ✅ Todos los festivales tienen lugar_encuentro.');
    await pool.end(); return;
  }

  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  let wikipedia = 0, fallback = 0, errores = 0;

  for (let i = 0; i < festivales.length; i++) {
    const f = festivales[i];
    process.stdout.write(`  [${String(i+1).padStart(3)}/${festivales.length}] ${pad(f.nombre, 40)} `);

    let lugar   = null;
    let fuente  = null;

    // 1. Wikipedia
    if (f.municipio) {
      try {
        const wp = await fetchLugarWikipedia(f.nombre, f.municipio, f.departamento);
        if (wp?.lugar) { lugar = wp.lugar; fuente = 'wikipedia'; wikipedia++; }
      } catch { /* sigue */ }
    }

    // 2. Fallback geográfico: municipio + departamento
    if (!lugar && f.municipio) {
      lugar  = f.departamento
        ? `${f.municipio}, ${f.departamento}`
        : f.municipio;
      fuente = 'geo-fallback';
      fallback++;
    }

    if (!lugar) {
      console.log('—');
      errores++;
      continue;
    }

    console.log(`[${fuente}] ${lugar}`);

    if (!DRY_RUN) {
      try {
        await pool.query(
          `UPDATE festivals SET lugar_encuentro = $1 WHERE id = $2`,
          [lugar, f.id]
        );
      } catch (e) {
        console.log(`    ❌ BD: ${e.message}`);
        errores++;
      }
    }

    await sleep(D_WP);
  }

  // Resumen
  console.log('\n' + '═'.repeat(70));
  console.log('  RESUMEN');
  console.log('═'.repeat(70));
  console.log(`  Desde Wikipedia       : ${wikipedia}`);
  console.log(`  Fallback geográfico   : ${fallback}`);
  if (errores) console.log(`  Sin datos / errores   : ${errores}`);
  console.log(`  Total procesados      : ${festivales.length}`);
  if (DRY_RUN) console.log('  ℹ️  DRY RUN — sin cambios en BD');
  console.log('═'.repeat(70) + '\n');

  await pool.end();
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); pool.end(); process.exit(1); });
