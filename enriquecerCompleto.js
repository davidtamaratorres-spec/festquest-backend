/**
 * enriquecerCompleto.js
 *
 * Enriquecimiento completo y verificado de municipios con festivales.
 *
 * Flujo:
 *   1. Obtener municipios con festivales
 *   2. Filtrar: solo los que tienen festival con descripcion + lugar_encuentro
 *   3. Por cada municipio válido:
 *      a. Nominatim OSM   → latitud, longitud
 *      b. Wikipedia ES    → gentilicio, alcalde, altura, temperatura, habitantes
 *      c. Google Places   → sitio_1/2/3 + maps_1/2/3, hotel_1/2/3 + wa_1/2/3
 *   4. Guardar en BD solo lo que se encuentre (null si no hay certeza)
 *   5. Reporte final detallado
 *
 * Uso:
 *   node enriquecerCompleto.js               → todos los municipios válidos
 *   node enriquecerCompleto.js --dry-run     → sin escribir en BD
 *   node enriquecerCompleto.js --id 42       → solo un municipio
 *   node enriquecerCompleto.js --skip-places → omitir Google Places (más rápido)
 *   node enriquecerCompleto.js --desde 50    → empezar desde la posición N
 */

require('dotenv').config();
const axios  = require('axios');
const { Pool } = require('pg');
const fs     = require('fs');
const path   = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const DRY_RUN    = process.argv.includes('--dry-run');
const SKIP_PLACES = process.argv.includes('--skip-places');
const ONLY_ID    = (() => { const i = process.argv.indexOf('--id');    return i !== -1 ? parseInt(process.argv[i+1], 10) : null; })();
const DESDE      = (() => { const i = process.argv.indexOf('--desde'); return i !== -1 ? parseInt(process.argv[i+1], 10) : 0;    })();
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── Delays (respetar rate limits) ──────────────────────────────────────────
const D_NOMINATIM = 1100;
const D_WIKI      = 500;
const D_PLACES    = 250;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Log de resultados ──────────────────────────────────────────────────────
const LOG_PATH = path.join(__dirname, 'data', 'enriquecimiento_log.jsonl');
function appendLog(entry) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

// ── 1. NOMINATIM (coordenadas) ─────────────────────────────────────────────
async function fetchCoordenadas(nombre, departamento) {
  const q = encodeURIComponent(`${nombre}, ${departamento || ''}, Colombia`);
  try {
    const { data } = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=co`,
      { headers: { 'User-Agent': 'FestQuest/1.0 (festquest.app)' }, timeout: 10000 }
    );
    if (!data?.length) return null;
    const best = data.find(r =>
      ['city','town','village','municipality','administrative'].includes(r.type)
    ) || data[0];
    const lat = parseFloat(best.lat);
    const lng = parseFloat(best.lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { latitud: lat, longitud: lng, fuente: 'nominatim' };
  } catch { return null; }
}

// ── 2. WIKIPEDIA ES ────────────────────────────────────────────────────────
const WP_API = 'https://es.wikipedia.org/w/api.php';

async function fetchWikipedia(nombre, departamento) {
  let pageContent = '';
  let pageTitle   = '';

  const intentos = [
    `${nombre}, ${departamento}`,
    `Municipio de ${nombre}`,
    nombre,
  ];

  for (const q of intentos) {
    try {
      const { data: s } = await axios.get(WP_API, {
        params: { action: 'query', list: 'search', srsearch: q, srlimit: 5, format: 'json', utf8: 1 },
        timeout: 8000,
      });
      const hits = (s?.query?.search || []).filter(h =>
        h.title.toLowerCase().includes(nombre.toLowerCase().split(' ')[0]) &&
        !h.title.toLowerCase().includes('desambiguación')
      );
      if (!hits.length) continue;

      const { data: p } = await axios.get(WP_API, {
        params: {
          action: 'query', prop: 'revisions', titles: hits[0].title,
          rvprop: 'content', rvslots: 'main', format: 'json', utf8: 1,
        },
        timeout: 12000,
      });
      const pages = p?.query?.pages || {};
      const pid   = Object.keys(pages)[0];
      if (!pid || pid === '-1') continue;
      const content = pages[pid]?.revisions?.[0]?.slots?.main?.['*'] || '';
      if (content.length > 1000) { pageContent = content; pageTitle = hits[0].title; break; }
    } catch { /* continuar con siguiente intento */ }
    await sleep(200);
  }

  if (!pageContent) return {};

  // ── Parser de infobox ──────────────────────────────────────────────────
  function getField(...aliases) {
    for (const alias of aliases) {
      const re = new RegExp(`\\|\\s*${alias}\\s*=\\s*([^\\|\\}\\n\\r]{1,200})`, 'i');
      const m  = pageContent.match(re);
      if (!m) continue;
      const v = m[1]
        .replace(/\[\[([^\|\]]+\|)?([^\]]+)\]\]/g, '$2')
        .replace(/\{\{formatnum:([^}]+)\}\}/gi, '$1')
        .replace(/\{\{[^}]+\}\}/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/'{2,3}|&nbsp;|<!--.*?-->/g, '')
        .replace(/\[\[[^\]]+\]\]/g, '')
        .trim();
      if (v.length > 0 && v.length < 120) return v;
    }
    return null;
  }

  const result = {};
  const src    = `wikipedia:${pageTitle}`;

  // Gentilicio
  const gent = getField('gentilicio', 'gentilicio1');
  if (gent) {
    const limpio = gent.split(/[,\/\n\(]/)[0].trim();
    if (limpio.length >= 2 && limpio.length <= 50 && !/\d/.test(limpio)) {
      result.gentilicio = { value: limpio, fuente: src };
    }
  }

  // Alcalde (solo nombre, sin fechas ni cargos)
  const alc = getField('alcalde', 'alcaldesa', 'alcalde_nombre', 'alcalde1', 'mandatario', 'gobernante');
  if (alc) {
    const limpio = alc.split(/[\(\n\|]/)[0].trim();
    // Solo si parece un nombre de persona (al menos 2 palabras, sin números raros)
    const palabras = limpio.split(/\s+/).filter(Boolean);
    if (palabras.length >= 2 && palabras.length <= 5 && limpio.length <= 70 && !/\d{4}/.test(limpio)) {
      result.alcalde = { value: limpio, fuente: src };
    }
  }

  // Altura
  const altStr = getField('altitud', 'altitud_media', 'elevación', 'altitud_msnm', 'elevation_m');
  if (altStr) {
    const n = parseInt(altStr.replace(/[^\d]/g, ''), 10);
    if (!isNaN(n) && n >= 1 && n <= 5800) result.altura = { value: n, fuente: src };
  }

  // Temperatura promedio
  const tStr = getField('temperatura_media', 'temperatura', 'temp_media_anual', 'clima_temperatura', 'temperatura_promedio');
  if (tStr) {
    const n = parseFloat(tStr.replace(',', '.').replace(/[^\d.]/g, ''));
    if (!isNaN(n) && n >= 2 && n <= 42) result.temperatura_promedio = { value: n, fuente: src };
  }

  // Habitantes (infobox como referencia)
  const habStr = getField('población_total', 'población', 'poblacion', 'habitantes', 'pop_total');
  if (habStr) {
    const n = parseInt(habStr.replace(/[.,\s]/g, '').replace(/[^\d]/g, ''), 10);
    if (!isNaN(n) && n >= 200 && n <= 12000000) result.habitantes = { value: n, fuente: src };
  }

  // Bandera URL (Wikipedia Commons)
  const bandStr = getField('imagen_bandera', 'bandera', 'flag', 'flag_image');
  if (bandStr) {
    const archivo = bandStr.replace(/^(File:|Archivo:|Image:)/i, '').trim();
    if (archivo.length > 3 && /\.(png|jpg|svg|jpeg)/i.test(archivo)) {
      const encoded = encodeURIComponent(archivo.replace(/ /g, '_'));
      result.bandera_url = {
        value: `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`,
        fuente: src,
      };
    }
  }

  return result;
}

// ── 3. GOOGLE PLACES ──────────────────────────────────────────────────────
async function textSearch(query) {
  if (!PLACES_KEY) return [];
  try {
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      { params: { query, key: PLACES_KEY }, timeout: 10000 }
    );
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
    return data.results || [];
  } catch { return []; }
}

async function placePhone(placeId) {
  if (!PLACES_KEY || !placeId) return null;
  try {
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      { params: { place_id: placeId, fields: 'formatted_phone_number', key: PLACES_KEY }, timeout: 8000 }
    );
    return data.result?.formatted_phone_number || null;
  } catch { return null; }
}

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function waLink(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  let n = digits.startsWith('57') ? digits.slice(2) : digits;
  if (n.startsWith('0')) n = n.slice(1);
  if (n.length < 7) return null;
  return `https://wa.me/57${n}`;
}

async function fetchPlaces(nombre, departamento) {
  if (!PLACES_KEY || SKIP_PLACES) return { sitios: [], hoteles: [] };
  const q = `${nombre} ${departamento || ''} Colombia`;

  const [sitioRes, hotelRes] = await Promise.all([
    textSearch(`sitios turísticos ${q}`),
    textSearch(`hoteles ${q}`),
  ]);
  await sleep(D_PLACES);

  const sitios = sitioRes.slice(0, 3).map(p => ({
    nombre: p.name,
    maps: p.geometry?.location ? mapsLink(p.geometry.location.lat, p.geometry.location.lng) : null,
  }));

  const hotelesRaw = hotelRes.slice(0, 3);
  const hoteles = [];
  for (const p of hotelesRaw) {
    const phone = await placePhone(p.place_id);
    await sleep(D_PLACES);
    hoteles.push({ nombre: p.name, wa: waLink(phone) });
  }

  return { sitios, hoteles };
}

// ── 4. Filtro festivales ───────────────────────────────────────────────────
async function getMunicipiosValidos() {
  // Todos los municipios con al menos un festival activo
  const { rows: todos } = await pool.query(`
    SELECT DISTINCT ON (m.id)
      m.id, m.nombre, m.departamento,
      m.latitud, m.longitud, m.gentilicio, m.alcalde,
      m.altura, m.temperatura_promedio, m.habitantes,
      m.codigo_dane, m.bandera_url,
      m.sitio_1, m.hotel_1,
      f.nombre      AS fest_nombre,
      f.descripcion AS fest_desc,
      f.fecha_inicio AS fest_fecha,
      f.municipio_id
    FROM municipalities m
    INNER JOIN festivals f ON f.municipio_id = m.id AND f.is_active IS NOT FALSE
    ORDER BY m.id, f.descripcion DESC NULLS LAST
  `);

  const validos     = [];
  const descartados = [];

  for (const r of todos) {
    // Criterio mínimo: nombre de festival + descripción no vacía + municipio vinculado
    // lugar_encuentro NO se usa como filtro (campo vacío en fuente, a completar)
    const nombreOk = r.fest_nombre?.trim()?.length >= 2;
    const descOk   = r.fest_desc?.trim()?.length >= 10;
    const muniLink = !!r.municipio_id;

    if (nombreOk && descOk && muniLink) {
      validos.push(r);
    } else {
      descartados.push({
        id: r.id, nombre: r.nombre,
        razon: !nombreOk ? 'nombre festival vacío'
             : !descOk   ? 'descripción festival vacía (<10 chars)'
             :              'municipio_id nulo',
      });
    }
  }

  return { validos, descartados };
}

// ── 5. Update BD ───────────────────────────────────────────────────────────
async function updateMunicipio(id, datos) {
  const campos = Object.keys(datos).filter(k => datos[k] !== null && datos[k] !== undefined);
  if (!campos.length) return 0;
  const sets   = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const values = [...campos.map(c => datos[c]), id];
  const { rowCount } = await pool.query(
    `UPDATE municipalities SET ${sets}, fecha_actualizacion = NOW() WHERE id = $${values.length}`,
    values
  );
  return rowCount;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  // Asegurar carpeta data/
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
  }

  console.log(`\n🚀 enriquecerCompleto.js${DRY_RUN ? ' [DRY RUN]' : ''}${SKIP_PLACES ? ' [sin Places]' : ''}\n`);
  if (!PLACES_KEY) console.log('⚠️  GOOGLE_PLACES_API_KEY no encontrada — sitios/hoteles se omitirán\n');

  // ── Paso 1: Filtro de festivales ─────────────────────────────────────────
  console.log('⏳ Paso 1: Filtrando municipios por completitud de su festival...');
  let { validos, descartados } = await getMunicipiosValidos();

  if (ONLY_ID) {
    validos = validos.filter(m => m.id === ONLY_ID);
    if (!validos.length) {
      console.log(`❌ Municipio ID ${ONLY_ID} no encontrado o descartado`);
      await pool.end(); return;
    }
  }

  if (DESDE > 0) validos = validos.slice(DESDE - 1);

  console.log(`  ✅ Municipios válidos:    ${validos.length}`);
  console.log(`  ❌ Descartados:           ${descartados.length}`);

  if (descartados.length) {
    const razones = {};
    descartados.forEach(d => { razones[d.razon] = (razones[d.razon] || 0) + 1; });
    Object.entries(razones).forEach(([r, n]) => console.log(`     · ${n} por "${r}"`));
  }
  console.log('');

  // ── Paso 2: Enriquecimiento ──────────────────────────────────────────────
  const stats = {
    municipios_procesados: 0,
    municipios_actualizados: 0,
    campos_completados: 0,
    campos_null: 0,
    por_campo: {},
  };

  const CAMPOS_TRACK = [
    'latitud','longitud','gentilicio','alcalde','altura',
    'temperatura_promedio','habitantes','bandera_url',
    'sitio_1','sitio_2','sitio_3','maps_1','maps_2','maps_3',
    'hotel_1','hotel_2','hotel_3','wa_1','wa_2','wa_3',
  ];
  CAMPOS_TRACK.forEach(c => { stats.por_campo[c] = { completados: 0, null: 0 }; });

  console.log('⏳ Paso 2: Enriqueciendo municipios...\n');

  for (const m of validos) {
    const idx = validos.indexOf(m) + 1 + (DESDE > 0 ? DESDE - 1 : 0);
    process.stdout.write(`  [${String(idx).padStart(3)}/${validos.length + (DESDE > 0 ? DESDE - 1 : 0)}] ${m.nombre.padEnd(28)} `);

    const nuevos   = {};  // campo → valor
    const fuentes  = {};  // campo → fuente

    // ── Nominatim ────────────────────────────────────────────────────────
    if (!m.latitud || !m.longitud) {
      const coords = await fetchCoordenadas(m.nombre, m.departamento);
      await sleep(D_NOMINATIM);
      if (coords) {
        nuevos.latitud  = coords.latitud;
        nuevos.longitud = coords.longitud;
        fuentes.latitud  = coords.fuente;
        fuentes.longitud = coords.fuente;
      }
    }

    // ── Wikipedia ────────────────────────────────────────────────────────
    const needsWp = !m.gentilicio || !m.alcalde || !m.altura
                    || !m.temperatura_promedio || !m.habitantes || !m.bandera_url;
    if (needsWp) {
      const wp = await fetchWikipedia(m.nombre, m.departamento);
      await sleep(D_WIKI);

      const mapWp = [
        ['gentilicio',         m.gentilicio],
        ['alcalde',            m.alcalde],
        ['altura',             m.altura],
        ['temperatura_promedio', m.temperatura_promedio],
        ['habitantes',         m.habitantes],
        ['bandera_url',        m.bandera_url],
      ];
      for (const [campo, existente] of mapWp) {
        if (!existente && wp[campo]) {
          nuevos[campo]  = wp[campo].value;
          fuentes[campo] = wp[campo].fuente;
        }
      }
    }

    // ── Google Places ────────────────────────────────────────────────────
    const needsPlaces = !m.sitio_1 || !m.hotel_1;
    if (needsPlaces && PLACES_KEY && !SKIP_PLACES) {
      const { sitios, hoteles } = await fetchPlaces(m.nombre, m.departamento);
      const placeFuente = 'google_places';

      const smap = [['sitio_1','maps_1'], ['sitio_2','maps_2'], ['sitio_3','maps_3']];
      for (let i = 0; i < sitios.length; i++) {
        if (!m[`sitio_${i+1}`]) {
          nuevos[`sitio_${i+1}`]  = sitios[i].nombre;
          fuentes[`sitio_${i+1}`] = placeFuente;
          if (sitios[i].maps) {
            nuevos[`maps_${i+1}`]  = sitios[i].maps;
            fuentes[`maps_${i+1}`] = placeFuente;
          }
        }
      }
      const hmap = [['hotel_1','wa_1'], ['hotel_2','wa_2'], ['hotel_3','wa_3']];
      for (let i = 0; i < hoteles.length; i++) {
        if (!m[`hotel_${i+1}`]) {
          nuevos[`hotel_${i+1}`]  = hoteles[i].nombre;
          fuentes[`hotel_${i+1}`] = placeFuente;
          if (hoteles[i].wa) {
            nuevos[`wa_${i+1}`]  = hoteles[i].wa;
            fuentes[`wa_${i+1}`] = placeFuente;
          }
        }
      }
    }

    // ── Contabilizar ──────────────────────────────────────────────────────
    CAMPOS_TRACK.forEach(c => {
      const yaTeníaDato = !!(m[c]);
      const encontróDato = nuevos[c] !== undefined;
      if (!yaTeníaDato) {
        if (encontróDato) stats.por_campo[c].completados++;
        else               stats.por_campo[c].null++;
      }
    });

    const camposNuevos = Object.keys(nuevos);
    stats.municipios_procesados++;
    stats.campos_completados += camposNuevos.length;
    stats.campos_null += CAMPOS_TRACK.filter(c => !m[c] && !nuevos[c]).length;

    if (!camposNuevos.length) {
      console.log('(sin datos nuevos)');
      continue;
    }

    const resumen = camposNuevos.map(k => `${k}[${fuentes[k] || '?'}]`).join(' ');
    console.log(resumen.slice(0, 100));

    // Log JSONL
    appendLog({ id: m.id, nombre: m.nombre, ts: new Date().toISOString(), datos: nuevos, fuentes });

    if (!DRY_RUN) {
      try {
        const r = await updateMunicipio(m.id, nuevos);
        if (r > 0) stats.municipios_actualizados++;
      } catch (e) {
        console.log(`    ❌ Error BD: ${e.message}`);
      }
    } else {
      stats.municipios_actualizados++;
    }
  }

  // ── Paso 3: Reporte final ────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 REPORTE FINAL\n');
  console.log(`  Municipios filtrados (festival completo):  ${validos.length}`);
  console.log(`  Municipios descartados (festival parcial): ${descartados.length}`);
  console.log(`  Municipios procesados:                     ${stats.municipios_procesados}`);
  console.log(`  Municipios actualizados en BD:             ${stats.municipios_actualizados}`);
  console.log(`  Campos completados (nuevos):               ${stats.campos_completados}`);
  console.log(`  Campos que quedaron null:                  ${stats.campos_null}`);

  console.log('\n  Detalle por campo:');
  console.log(`  ${'CAMPO'.padEnd(24)} ${'COMPLETADOS'.padStart(12)} ${'NULL'.padStart(8)}`);
  console.log(`  ${'─'.repeat(46)}`);
  CAMPOS_TRACK.forEach(c => {
    const cc = stats.por_campo[c].completados;
    const cn = stats.por_campo[c].null;
    if (cc + cn > 0) {
      const bar = cc > 0 ? '█'.repeat(Math.round(cc / (cc + cn) * 10)) : '';
      console.log(`  ${c.padEnd(24)} ${String(cc).padStart(12)} ${String(cn).padStart(8)}  ${bar}`);
    }
  });

  if (descartados.length) {
    console.log('\n  Municipios descartados (requieren carga manual):');
    descartados.slice(0, 20).forEach(d =>
      console.log(`  · ${d.nombre.padEnd(28)} — ${d.razon}`)
    );
    if (descartados.length > 20) console.log(`  ... y ${descartados.length - 20} más`);
  }

  if (!DRY_RUN) {
    console.log(`\n  Log detallado: data/enriquecimiento_log.jsonl`);
  }
  console.log(`\n${'═'.repeat(70)}\n`);

  await pool.end();
}

main().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  console.error(e.stack);
  pool.end();
  process.exit(1);
});
