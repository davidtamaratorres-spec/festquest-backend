/**
 * completarMunicipios.js  — v2 con parsers corregidos
 *
 * Fuentes:
 *   1. Wikipedia ES  → gentilicio, alcalde, altitud, temperatura, población
 *      Template: {{Ficha de entidad subnacional}} (campo real de municipios CO)
 *      y        {{Ficha de localidad de Colombia}} (template viejo, algunos municipios)
 *   2. DANE datos.gov.co → latitud/longitud (con , decimal), cod_mpio
 *      Endpoint: /resource/gdxc-w37w.json?cod_mpio=<codigo_dane>
 *   3. Nominatim OSM → lat/lon fallback si DANE no tiene coords
 *
 * Uso:
 *   node completarMunicipios.js           → DRY RUN (sin BD)
 *   node completarMunicipios.js --apply   → escribe en BD
 *   node completarMunicipios.js --id 42   → solo ese municipio
 *   node completarMunicipios.js --todos   → todos los municipios (no solo los de festivales)
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool     = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN  = !process.argv.includes('--apply');
const TODOS    = process.argv.includes('--todos');
const ONLY_ID  = (() => { const i = process.argv.indexOf('--id');  return i !== -1 ? parseInt(process.argv[i+1], 10) : null; })();

const D_WP   = 2000;  // ms entre llamadas Wikipedia (2 s para evitar rate-limit)
const D_DANE = 350;   // ms entre llamadas DANE
const D_NOM  = 1200;  // ms entre llamadas Nominatim (ToS: ≤1 req/s)
const sleep  = ms => new Promise(r => setTimeout(r, ms));

// ── Campos diagnosticados ──────────────────────────────────────────────────
const CAMPOS = [
  'habitantes','temperatura_promedio','altura',
  'alcalde','gentilicio','codigo_dane',
  'latitud','longitud','sitio_1','hotel_1',
];
const presente = v => v !== null && v !== undefined && String(v).trim().length > 0;

// ── Limpiar texto wiki ─────────────────────────────────────────────────────
function cleanWiki(raw) {
  if (!raw) return '';
  return raw
    .replace(/<small[^>]*>.*?<\/small>/gis, '')  // <small>...</small>
    .replace(/<ref[^>]*>.*?<\/ref>/gis, '')       // <ref>...</ref>
    .replace(/<ref[^/]*\/>/gi, '')                // <ref />
    .replace(/<br\s*\/?>/gi, '')                  // <br/>
    .replace(/<[^>]+>/g, '')                      // resto de HTML
    .replace(/\[\[([^\|\]]+\|)?([^\]]+)\]\]/g, '$2') // [[link|texto]] → texto
    .replace(/\{\{formatnum:([^}]+)\}\}/gi, '$1')    // {{formatnum:X}} → X
    .replace(/\{\{[^}]+\}\}/g, '')               // otros templates
    .replace(/'''|''|&nbsp;/g, '')
    .replace(/<!--.*?-->/gs, '')
    .trim();
}

// Extraer un campo de la infobox wiki (cualquier template)
function getField(content, ...aliases) {
  for (const alias of aliases) {
    const re = new RegExp(`\\|\\s*${alias}\\s*=\\s*([^\\|\\}\\n\\r]{1,250})`, 'i');
    const m  = content.match(re);
    if (m) {
      const v = cleanWiki(m[1]);
      if (v.length > 0 && v.length < 120) return v;
    }
  }
  return null;
}

// ── 1. WIKIPEDIA ES ────────────────────────────────────────────────────────
const WP_API = 'https://es.wikipedia.org/w/api.php';

async function fetchWikipedia(nombre, departamento) {
  const result = {};
  let content  = '';

  // Búsqueda del artículo
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
      const raw = pages[pid]?.revisions?.[0]?.slots?.main?.['*'] || '';
      if (raw.length > 800) { content = raw; break; }
    } catch { /* continuar con siguiente query */ }
    await sleep(200);
  }

  if (!content) return result;

  // ── Gentilicio ────────────────────────────────────────────────────────────
  const gent = getField(content, 'gentilicio', 'gentilicio1', 'gentilicio2');
  if (gent) {
    const limpio = gent.split(/[,\/\n]/)[0].trim();
    if (limpio.length >= 2 && limpio.length <= 50 && !/\d/.test(limpio))
      result.gentilicio = limpio;
  }

  // ── Alcalde — template NUEVO: dirigentes_nombres, template VIEJO: alcalde ─
  const alc = getField(content,
    'dirigentes_nombres',          // {{Ficha de entidad subnacional}}
    'alcalde', 'alcaldesa', 'alcalde_nombre', 'alcalde1', 'mandatario'
  );
  if (alc) {
    // Quitar período de mandato "(2024-2027)" si viene incluido
    const limpio = alc
      .replace(/\s*\(?\d{4}[-–]\d{4}\)?\s*$/g, '')
      .replace(/\s*\(?\d{4}\)?\s*$/g, '')
      .split(/[\(\n\|]/)[0].trim();
    const palabras = limpio.split(/\s+/).filter(Boolean);
    if (palabras.length >= 2 && palabras.length <= 6 && limpio.length <= 80
        && !/\d{4}/.test(limpio))
      result.alcalde = limpio;
  }

  // ── Altura ────────────────────────────────────────────────────────────────
  const altRaw = getField(content, 'altitud', 'altitud_media', 'elevación', 'altitud_msnm');
  if (altRaw) {
    const n = parseInt(altRaw.replace(/[^\d]/g, ''), 10);
    if (!isNaN(n) && n >= 1 && n <= 5800) result.altura = n;
  }

  // ── Temperatura ───────────────────────────────────────────────────────────
  const tempRaw = getField(content,
    'temperatura', 'temperatura_media', 'temp_media_anual', 'clima_temperatura'
  );
  if (tempRaw) {
    const n = parseFloat(tempRaw.replace(',', '.').replace(/[^\d.]/g, ''));
    if (!isNaN(n) && n >= 1 && n <= 42) result.temperatura_promedio = n;
  }

  // ── Población — template NUEVO: "población", template VIEJO: "población_total" ─
  const habRaw = getField(content,
    'población',          // {{Ficha de entidad subnacional}} — campo directo
    'población_total', 'poblacion', 'habitantes', 'pop_total'
  );
  if (habRaw) {
    // Puede tener puntos o comas como miles: "1.234.567" o "1,234,567"
    const n = parseInt(habRaw.replace(/[.,\s]/g, '').replace(/[^\d]/g, ''), 10);
    if (!isNaN(n) && n >= 200 && n <= 12_000_000) result.habitantes = n;
  }

  // ── Bandera URL (Wikimedia Commons) ──────────────────────────────────────
  const bandRaw = getField(content, 'imagen_bandera', 'bandera', 'flag', 'flag_image');
  if (bandRaw && /\.(png|jpg|svg|jpeg)/i.test(bandRaw)) {
    const archivo = bandRaw.replace(/^(File:|Archivo:|Image:)/i, '').trim();
    if (archivo.length > 3) {
      result.bandera_url = `https://commons.wikimedia.org/wiki/Special:FilePath/${
        encodeURIComponent(archivo.replace(/ /g, '_'))
      }`;
    }
  }

  return result;
}

// ── 2. DANE datos.gov.co — lookup directo por cod_mpio ────────────────────
// Dataset: Marco Geoestadístico Nacional (DIVIPOLA)
// Campo coma-decimal: "6,246631" → parseFloat("6.246631")
const DANE_URL = 'https://www.datos.gov.co/resource/gdxc-w37w.json';

async function fetchDANE(codigoDane) {
  if (!codigoDane) return null;
  try {
    const { data } = await axios.get(DANE_URL, {
      params: { cod_mpio: String(codigoDane), '$limit': 1 },
      timeout: 10000,
      headers: { Accept: 'application/json' },
    });
    if (!Array.isArray(data) || !data.length) return null;
    const row = data[0];

    const parseComa = v => v ? parseFloat(String(v).replace(',', '.')) : null;
    const lat = parseComa(row.latitud);
    const lon = parseComa(row.longitud);

    return {
      latitud:  (lat && !isNaN(lat)) ? lat : null,
      longitud: (lon && !isNaN(lon)) ? lon : null,
    };
  } catch {
    return null;
  }
}

// ── 3. Nominatim fallback ──────────────────────────────────────────────────
async function fetchNominatim(nombre, departamento, retries = 3) {
  const q = encodeURIComponent(`${nombre}, ${departamento}, Colombia`);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data } = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=co`,
        { headers: { 'User-Agent': 'FestQuest/1.0 contact@festquest.app' }, timeout: 10000 }
      );
      if (!data?.length) return null;
      const best = data.find(r =>
        ['city','town','village','municipality','administrative'].includes(r.type)
      ) || data[0];
      const lat = parseFloat(best.lat);
      const lon = parseFloat(best.lon);
      return (!isNaN(lat) && !isNaN(lon)) ? { latitud: lat, longitud: lon } : null;
    } catch {
      if (attempt < retries - 1) await sleep(D_NOM * (attempt + 1));
    }
  }
  return null;
}

// ── Update BD ──────────────────────────────────────────────────────────────
async function updateMunicipio(id, datos) {
  const campos = Object.keys(datos).filter(k => datos[k] !== null && datos[k] !== undefined);
  if (!campos.length) return 0;
  const sets   = campos.map((c, i) => `${c} = COALESCE($${i+1}, ${c})`).join(', ');
  const values = [...campos.map(c => datos[c]), id];
  const { rowCount } = await pool.query(
    `UPDATE municipalities SET ${sets}, fecha_actualizacion = NOW() WHERE id = $${values.length}`,
    values
  );
  return rowCount;
}

// ── Diagnóstico ────────────────────────────────────────────────────────────
async function diagnostico(label) {
  const { rows } = await pool.query(`
    SELECT id, nombre, departamento, ${CAMPOS.join(', ')}
    FROM municipalities
    WHERE id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
    ORDER BY nombre ASC
  `);

  const total = CAMPOS.length;
  const resultados = rows.map(r => {
    const vacios = CAMPOS.filter(c => !presente(r[c]));
    return { nombre: r.nombre, depto: r.departamento ?? '', vacios,
             pct: Math.round(((total - vacios.length) / total) * 100) };
  });

  const promedio = Math.round(resultados.reduce((s, r) => s + r.pct, 0) / resultados.length);
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  const L = 100;

  console.log(`\n${'═'.repeat(L)}`);
  console.log(`  DIAGNÓSTICO — ${label}   (${rows.length} municipios)`);
  console.log(`${'═'.repeat(L)}`);
  console.log(`  ${'MUNICIPIO'.padEnd(28)} ${'DEPTO'.padEnd(22)} ${'%'.padEnd(5)} VACÍOS`);
  console.log(`  ${'─'.repeat(L-2)}`);
  for (const r of resultados.sort((a, b) => a.pct - b.pct))
    console.log(`  ${pad(r.nombre,28)} ${pad(r.depto,22)} ${pad(r.pct+'%',5)} ${r.vacios.join(', ') || '✓ completo'}`);

  console.log(`\n  Promedio: ${promedio}%`);
  console.log('\n  VACÍOS POR CAMPO:');
  CAMPOS.map(c => ({ c, n: rows.filter(r => !presente(r[c])).length }))
    .sort((a,b) => b.n - a.n)
    .forEach(({ c, n }) => {
      const bar = '█'.repeat(Math.round(n/rows.length*20)).padEnd(20);
      console.log(`    ${c.padEnd(22)} ${bar} ${n}/${rows.length}`);
    });

  return { rows, promedio };
}

// ── Selección ──────────────────────────────────────────────────────────────
async function getMunicipios() {
  if (ONLY_ID) {
    const { rows } = await pool.query(
      `SELECT id, nombre, departamento, codigo_dane, habitantes, latitud, longitud,
              altura, temperatura_promedio, gentilicio, alcalde, bandera_url
       FROM municipalities WHERE id = $1`, [ONLY_ID]
    );
    return rows;
  }
  const needsFields = `(latitud IS NULL OR longitud IS NULL OR gentilicio IS NULL
                        OR alcalde IS NULL OR altura IS NULL
                        OR temperatura_promedio IS NULL OR habitantes IS NULL)`;
  const scope = TODOS
    ? `FROM municipalities WHERE ${needsFields}`
    : `FROM municipalities
       WHERE ${needsFields}
         AND id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)`;
  const { rows } = await pool.query(
    `SELECT id, nombre, departamento, codigo_dane, habitantes, latitud, longitud,
            altura, temperatura_promedio, gentilicio, alcalde, bandera_url
     ${scope} ORDER BY nombre ASC`
  );
  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(72)}`);
  console.log('  FestQuest — completarMunicipios.js  (v2 parsers corregidos)');
  console.log(`  Modo: ${DRY_RUN ? 'DRY RUN — sin cambios en BD' : '🔴 APPLY — escribiendo en BD'}`);
  console.log(`${'═'.repeat(72)}`);

  await diagnostico('ANTES del enriquecimiento');

  const municipios = await getMunicipios();
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  ENRIQUECIMIENTO — ${municipios.length} municipios con campos vacíos`);
  if (DRY_RUN) console.log('  ⚠️  DRY RUN: los datos NO se guardarán en BD');
  console.log(`${'─'.repeat(72)}\n`);

  if (!municipios.length) {
    console.log('✅ Todo completado. No hay campos vacíos.\n');
    await pool.end(); return;
  }

  let updated = 0, sinDatos = 0, errores = 0;
  const conteo = {};  // campo → {wp:0, dane:0, nom:0}
  CAMPOS.forEach(c => { conteo[c] = { wp: 0, dane: 0, nom: 0 }; });

  for (let i = 0; i < municipios.length; i++) {
    const m   = municipios[i];
    const pfx = `  [${String(i+1).padStart(3)}/${municipios.length}] ${m.nombre.padEnd(30)}`;
    process.stdout.write(pfx);

    const datos   = {};
    const fuentes = {};

    // ── Wikipedia ────────────────────────────────────────────────────────────
    const needsWp = !m.gentilicio || !m.alcalde || !m.altura
                    || !m.temperatura_promedio || !m.habitantes || !m.bandera_url;
    if (needsWp) {
      try {
        const wp = await fetchWikipedia(m.nombre, m.departamento);
        const wpMap = [
          ['gentilicio',          m.gentilicio],
          ['alcalde',             m.alcalde],
          ['altura',              m.altura],
          ['temperatura_promedio',m.temperatura_promedio],
          ['habitantes',          m.habitantes],
          ['bandera_url',         m.bandera_url],
        ];
        for (const [campo, existente] of wpMap) {
          if (!existente && wp[campo] !== undefined) {
            datos[campo]   = wp[campo];
            fuentes[campo] = 'wp';
            if (campo in conteo) conteo[campo].wp++;
          }
        }
      } catch { /* continuar */ }
      await sleep(D_WP);
    }

    // ── DANE (coords por codigo_dane) ─────────────────────────────────────
    if (!m.latitud || !m.longitud) {
      try {
        const dane = await fetchDANE(m.codigo_dane);
        if (dane?.latitud && !datos.latitud) {
          datos.latitud   = dane.latitud;
          datos.longitud  = dane.longitud;
          fuentes.latitud  = 'dane';
          fuentes.longitud = 'dane';
          conteo.latitud.dane++;
          conteo.longitud.dane++;
        }
      } catch { /* continuar */ }
      await sleep(D_DANE);
    }

    // ── Nominatim fallback (si DANE no dio coords) ────────────────────────
    if (!m.latitud && !m.longitud && !datos.latitud) {
      try {
        const nom = await fetchNominatim(m.nombre, m.departamento);
        if (nom) {
          datos.latitud   = nom.latitud;
          datos.longitud  = nom.longitud;
          fuentes.latitud  = 'nominatim';
          fuentes.longitud = 'nominatim';
          conteo.latitud.nom++;
          conteo.longitud.nom++;
        }
      } catch { /* continuar */ }
      await sleep(D_NOM);
    }

    const encontrados = Object.keys(datos);
    if (!encontrados.length) {
      console.log('—');
      sinDatos++;
      continue;
    }

    const resumen = encontrados.map(k =>
      `${k}=${String(datos[k]).slice(0,15)}[${fuentes[k]||'?'}]`
    ).join('  ');
    console.log(resumen.slice(0, 120));

    if (!DRY_RUN) {
      try {
        const r = await updateMunicipio(m.id, datos);
        if (r > 0) updated++;
        else errores++;
      } catch (e) {
        console.log(`    ❌ BD: ${e.message}`);
        errores++;
      }
    } else {
      updated++;
    }
  }

  // ── Diagnóstico final ─────────────────────────────────────────────────────
  if (!DRY_RUN) {
    const { promedio: despues } = await diagnostico('DESPUÉS del enriquecimiento');
    console.log(`\n  📈 Mejora: → ${despues}% promedio`);
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(72)}`);
  console.log('  RESUMEN FINAL');
  console.log(`${'═'.repeat(72)}`);
  console.log(`  Municipios con datos nuevos : ${updated}`);
  console.log(`  Sin datos nuevos            : ${sinDatos}`);
  if (errores) console.log(`  ❌ Errores BD               : ${errores}`);
  if (DRY_RUN) console.log('  ⚠️  DRY RUN — sin cambios en BD');

  console.log('\n  CAMPOS COMPLETADOS por fuente:');
  console.log(`  ${'CAMPO'.padEnd(24)} ${'Wikipedia'.padStart(10)} ${'DANE'.padStart(6)} ${'Nominatim'.padStart(10)}`);
  console.log(`  ${'─'.repeat(54)}`);
  CAMPOS.filter(c => c !== 'sitio_1' && c !== 'hotel_1' && c !== 'codigo_dane')
    .forEach(c => {
      const { wp, dane, nom } = conteo[c] || { wp:0, dane:0, nom:0 };
      if (wp + dane + nom > 0)
        console.log(`  ${c.padEnd(24)} ${String(wp).padStart(10)} ${String(dane).padStart(6)} ${String(nom).padStart(10)}`);
    });

  // Pendientes
  const { rows: fin } = await pool.query(`
    SELECT nombre, departamento,
      gentilicio IS NULL AS sg, alcalde IS NULL AS sa,
      altura IS NULL AS sal, temperatura_promedio IS NULL AS st,
      habitantes IS NULL AS sh, latitud IS NULL AS sc
    FROM municipalities
    WHERE id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
    ORDER BY nombre ASC
  `);
  const pendientes = fin.filter(r => r.sg||r.sa||r.sal||r.st||r.sh||r.sc);
  console.log(`\n  PENDIENTES CARGA MANUAL: ${pendientes.length} municipios`);
  if (pendientes.length <= 30) {
    pendientes.forEach(r => {
      const f = [r.sg&&'gentilicio',r.sa&&'alcalde',r.sal&&'altura',r.st&&'temp',r.sh&&'hab',r.sc&&'coords'].filter(Boolean);
      console.log(`    ${r.nombre.padEnd(30)} ${r.departamento?.padEnd(20)||''} → ${f.join(', ')}`);
    });
  } else {
    pendientes.slice(0,20).forEach(r => {
      const f = [r.sg&&'gentilicio',r.sa&&'alcalde',r.sal&&'altura',r.st&&'temp',r.sh&&'hab',r.sc&&'coords'].filter(Boolean);
      console.log(`    ${r.nombre.padEnd(30)} ${r.departamento?.padEnd(20)||''} → ${f.join(', ')}`);
    });
    console.log(`    ... y ${pendientes.length-20} más`);
  }

  console.log(`${'═'.repeat(72)}\n`);
  await pool.end();
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); pool.end(); process.exit(1); });
