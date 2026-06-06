/**
 * cargarDesdeCSV.js
 *
 * Carga datos pre-validados desde archivos locales a la BD.
 * Prioridad: fuentes locales > Wikipedia.
 *
 * Fuentes:
 *   1. data_std/municipios_master_std.csv
 *      → subregion, habitantes, temperatura_promedio, altura
 *
 *   2. data/alcaldes_colombia_actualizado.csv
 *      → alcalde (title case), correo_alcalde
 *
 *   3. Wikipedia ES (solo para gentilicio y bandera_url)
 *      → gentilicio donde no haya dato local
 *
 * Uso:
 *   node cargarDesdeCSV.js             → DRY RUN
 *   node cargarDesdeCSV.js --apply     → escribe en BD
 *   node cargarDesdeCSV.js --solo-csv  → solo CSV, sin Wikipedia
 */

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const { parse } = require('csv-parse/sync');
const axios  = require('axios');
const { Pool } = require('pg');

const pool      = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN   = !process.argv.includes('--apply');
const SOLO_CSV  = process.argv.includes('--solo-csv');
const sleep     = ms => new Promise(r => setTimeout(r, ms));

const toTitleCase = s => {
  // Normalizar: minúsculas, luego capitalizar inicio de cada palabra
  // Manejar caracteres con tilde: "GarcíA" → "García"
  const lower = s.toLowerCase();
  const titled = lower.replace(/(?:^|\s)\S/g, c => c.toUpperCase());
  return titled
    .replace(/\bDe\b/g, 'de').replace(/\bDel\b/g, 'del')
    .replace(/\bLa\b/g, 'la').replace(/\bLas\b/g, 'las')
    .replace(/\bLos\b/g, 'los').replace(/\bY\b/g, 'y')
    .replace(/\bEl\b/g, 'el').trim();
};

// ── Leer CSVs ──────────────────────────────────────────────────────────────
function readCsv(filepath) {
  return parse(fs.readFileSync(path.join(__dirname, filepath), 'utf8'), {
    columns: true, skip_empty_lines: true, trim: true,
  });
}

const stdRows = readCsv('data_std/municipios_master_std.csv');
const alcRows = readCsv('data/alcaldes_colombia_actualizado.csv');

// Índices por codigo_dane (normalizado como entero string sin ceros leading)
const normCode = c => c ? String(parseInt(c, 10)) : null;

const stdByCode = new Map(stdRows.map(r => [normCode(r.codigo_dane), r]));
const alcByCode = new Map(alcRows.map(r => [normCode(r.codigo_dane), r]));

// ── Wikipedia (solo gentilicio) ────────────────────────────────────────────
const WP_API = 'https://es.wikipedia.org/w/api.php';

function cleanWiki(raw) {
  if (!raw) return '';
  return raw
    .replace(/<small[^>]*>.*?<\/small>/gis, '')
    .replace(/<ref[^>]*>.*?<\/ref>/gis, '')
    .replace(/<ref[^/]*\/>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\|\]]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\{\{formatnum:([^}]+)\}\}/gi, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/'''|''|&nbsp;/g, '')
    .replace(/<!--.*?-->/gs, '')
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

async function fetchGentilicio(nombre, departamento) {
  const queries = [`${nombre}, ${departamento}`, nombre];
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
      if (content.length < 500) continue;

      const gent = getField(content, 'gentilicio', 'gentilicio1', 'gentilicio2');
      if (gent) {
        const limpio = gent.split(/[,\/\n]/)[0].trim();
        if (limpio.length >= 2 && limpio.length <= 50 && !/\d/.test(limpio))
          return limpio;
      }
      break;
    } catch { /* sigue */ }
    await sleep(200);
  }
  return null;
}

// ── Update BD ──────────────────────────────────────────────────────────────
async function updateMunicipio(id, datos) {
  const campos = Object.keys(datos).filter(k => datos[k] !== null && datos[k] !== undefined && String(datos[k]).trim() !== '');
  if (!campos.length) return 0;
  const sets   = campos.map((c, i) => `${c} = COALESCE($${i+1}, ${c})`).join(', ');
  const values = [...campos.map(c => datos[c]), id];
  const { rowCount } = await pool.query(
    `UPDATE municipalities SET ${sets}, fecha_actualizacion = NOW() WHERE id = $${values.length}`,
    values
  );
  return rowCount;
}

// ── Diagnóstico rápido ─────────────────────────────────────────────────────
async function diagnostico(label) {
  const CAMPOS = ['subregion','habitantes','temperatura_promedio','altura','alcalde','correo_alcalde','gentilicio'];
  const checks = CAMPOS.map(c =>
    `COUNT(CASE WHEN ${c} IS NOT NULL AND ${c}::text <> '' THEN 1 END) AS "${c}"`
  ).join(', ');
  const { rows: [r] } = await pool.query(`
    SELECT COUNT(*) AS total, ${checks}
    FROM municipalities
    WHERE id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
  `);
  const total = parseInt(r.total);
  console.log(`\n  ${label} (${total} municipios):`);
  CAMPOS.forEach(c => {
    const n   = parseInt(r[c]);
    const pct = Math.round(n / total * 100);
    const bar = '█'.repeat(Math.round(pct/5)).padEnd(20);
    console.log(`    ${c.padEnd(22)} ${String(n).padStart(4)}/${total}  ${String(pct+'%').padStart(4)}  ${bar}`);
  });
  return total;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log('  FestQuest — cargarDesdeCSV.js');
  console.log(`  Modo: ${DRY_RUN ? 'DRY RUN (sin cambios en BD)' : '🔴 APPLY — escribiendo en BD'}`);
  console.log(`${'═'.repeat(70)}`);

  await diagnostico('ANTES');

  // ── Cargar municipios con festivales ─────────────────────────────────────
  const { rows: municipios } = await pool.query(`
    SELECT m.id, m.nombre, m.departamento, m.codigo_dane,
           m.subregion, m.habitantes, m.temperatura_promedio, m.altura,
           m.alcalde, m.correo_alcalde, m.gentilicio
    FROM municipalities m
    WHERE m.id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
    ORDER BY m.nombre ASC
  `);

  console.log(`\n  Procesando ${municipios.length} municipios...\n`);

  // Contadores por fuente
  const cnt = {
    csv_subregion: 0, csv_habitantes: 0, csv_temperatura: 0, csv_altura: 0,
    csv_alcalde: 0, csv_correo: 0, wp_gentilicio: 0,
    sin_csv: 0, sin_wp: 0,
  };

  let updated = 0;

  for (const m of municipios) {
    const code   = normCode(m.codigo_dane);
    const datos  = {};
    const fts    = {};  // fuentes

    // ── FASE 1: municipios_master_std.csv ──────────────────────────────────
    const std = stdByCode.get(code);
    if (std) {
      // Los valores del CSV vienen como floats: "1475.0", "17599.0"
      // Usar parseFloat primero, luego redondear — NO eliminar el punto decimal
      const parseNum = v => {
        if (!v || !String(v).trim()) return null;
        const n = parseFloat(String(v).replace(',', '.'));
        return isNaN(n) ? null : n;
      };
      const parseInt2 = v => {
        if (!v || !String(v).trim()) return null;
        const n = Math.round(parseFloat(String(v).replace(',', '.')));
        return isNaN(n) || n <= 0 ? null : n;
      };

      if (!m.subregion          && std.subregion?.trim())        { datos.subregion          = std.subregion.trim();  fts.subregion = 'csv_std'; cnt.csv_subregion++; }
      if (!m.habitantes         && std.habitantes?.trim())       { const n = parseInt2(std.habitantes);   if (n && n > 0) { datos.habitantes = n; fts.habitantes = 'csv_std'; cnt.csv_habitantes++; } }
      if (!m.temperatura_promedio && std.temperatura_promedio?.trim()) { const n = parseNum(std.temperatura_promedio); if (n && n > 0) { datos.temperatura_promedio = n; fts.temperatura_promedio = 'csv_std'; cnt.csv_temperatura++; } }
      if (!m.altura             && std.altura?.trim())           { const n = parseInt2(std.altura);       if (n && n > 0) { datos.altura = n; fts.altura = 'csv_std'; cnt.csv_altura++; } }
    } else {
      cnt.sin_csv++;
    }

    // ── FASE 2: alcaldes_colombia_actualizado.csv ──────────────────────────
    const alc = alcByCode.get(code);
    if (alc) {
      if (!m.alcalde       && alc.mandatario?.trim()) { datos.alcalde       = toTitleCase(alc.mandatario); fts.alcalde       = 'csv_alc'; cnt.csv_alcalde++; }
      if (!m.correo_alcalde && alc.correo?.trim())   { datos.correo_alcalde = alc.correo.trim().toLowerCase(); fts.correo_alcalde = 'csv_alc'; cnt.csv_correo++; }
    }

    // ── FASE 3: Wikipedia → solo gentilicio ───────────────────────────────
    if (!m.gentilicio && !SOLO_CSV) {
      const gent = await fetchGentilicio(m.nombre, m.departamento);
      await sleep(1800);
      if (gent) { datos.gentilicio = gent; fts.gentilicio = 'wikipedia'; cnt.wp_gentilicio++; }
      else cnt.sin_wp++;
    }

    const encontrados = Object.keys(datos);
    if (!encontrados.length) continue;

    const log = encontrados.map(k => `${k}=${String(datos[k]).slice(0,20)}[${fts[k]}]`).join('  ');
    console.log(`  ${m.nombre.padEnd(28)} ${log.slice(0,110)}`);

    if (!DRY_RUN) {
      const r = await updateMunicipio(m.id, datos);
      if (r > 0) updated++;
    } else {
      updated++;
    }
  }

  // ── Diagnóstico final ────────────────────────────────────────────────────
  if (!DRY_RUN) await diagnostico('DESPUÉS');

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('  RESUMEN');
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Municipios actualizados : ${updated}`);
  console.log('');
  console.log('  CAMPOS POR FUENTE:');
  console.log(`    ${'Campo'.padEnd(22)} Fuente        Cantidad`);
  console.log(`    ${'─'.repeat(46)}`);
  [
    ['subregion',          'csv_std',   cnt.csv_subregion],
    ['habitantes',         'csv_std',   cnt.csv_habitantes],
    ['temperatura_promedio','csv_std',  cnt.csv_temperatura],
    ['altura',             'csv_std',   cnt.csv_altura],
    ['alcalde',            'csv_alc',   cnt.csv_alcalde],
    ['correo_alcalde',     'csv_alc',   cnt.csv_correo],
    ['gentilicio',         'wikipedia', cnt.wp_gentilicio],
  ].filter(([,,n]) => n > 0)
   .forEach(([campo, fuente, n]) =>
    console.log(`    ${campo.padEnd(22)} ${fuente.padEnd(13)} +${n}`)
  );
  if (cnt.sin_csv)  console.log(`\n  ⚠️  Sin match en CSV std:  ${cnt.sin_csv}`);
  if (cnt.sin_wp)   console.log(`  ⚠️  Sin gentilicio en WP:  ${cnt.sin_wp}`);
  if (DRY_RUN) console.log('\n  ⚠️  DRY RUN — sin cambios en BD');
  console.log(`${'═'.repeat(70)}\n`);

  await pool.end();
}

main().catch(e => { console.error('\n❌', e.message); pool.end(); process.exit(1); });
