/**
 * completarMunicipios.js
 *
 * Flujo completo para los 67 municipios con festivales:
 *   1. DIAGNÓSTICO — imprime tabla de completitud antes de enriquecer
 *   2. ENRIQUECIMIENTO — busca datos faltantes en:
 *        • Wikipedia REST API + MediaWiki API → gentilicio, alcalde, altura, temperatura, habitantes
 *        • datos.gov.co (DIVIPOLA DANE)       → codigo_dane, latitud, longitud
 *        • Nominatim (OpenStreetMap)           → latitud/longitud fallback
 *   3. UPDATE — aplica los datos encontrados en la BD (COALESCE: no sobreescribe existentes)
 *   4. REPORTE — compara completitud antes vs. después y lista campos aún pendientes
 *
 * Uso:
 *   node completarMunicipios.js                → preview (no escribe en BD)
 *   node completarMunicipios.js --apply        → ejecuta el UPDATE masivo
 *   node completarMunicipios.js --todos        → incluye municipios sin festivales
 *   node completarMunicipios.js --id 42        → solo ese municipio
 *   node completarMunicipios.js --campo gentilicio  → re-procesa solo ese campo
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN = !process.argv.includes('--apply');
const TODOS   = process.argv.includes('--todos');
const ONLY_ID = (() => { const i = process.argv.indexOf('--id');    return i !== -1 ? parseInt(process.argv[i + 1], 10) : null; })();
const SOLO_CAMPO = (() => { const i = process.argv.indexOf('--campo'); return i !== -1 ? process.argv[i + 1] : null; })();

const DELAY_NOMINATIM = 1100;
const DELAY_WP        = 400;
const DELAY_DANE      = 300;
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Campos que diagnosticamos ─────────────────────────────────────────────
const CAMPOS_DIAG = [
  'habitantes', 'temperatura_promedio', 'altura',
  'alcalde', 'gentilicio', 'codigo_dane',
  'latitud', 'longitud',
  'sitio_1', 'hotel_1',
];

function presente(v) {
  if (v === null || v === undefined) return false;
  return String(v).trim().length > 0;
}

// ── DIAGNÓSTICO ───────────────────────────────────────────────────────────
async function diagnostico(label) {
  const { rows } = await pool.query(`
    SELECT id, nombre, departamento,
           habitantes, temperatura_promedio, altura,
           alcalde, gentilicio, codigo_dane,
           latitud, longitud, sitio_1, hotel_1
    FROM municipalities
    WHERE id IN (
      SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL
    )
    ORDER BY nombre ASC
  `);

  const total = CAMPOS_DIAG.length;
  const resultados = rows.map(r => {
    const vacios = CAMPOS_DIAG.filter(c => !presente(r[c]));
    const pct = Math.round(((total - vacios.length) / total) * 100);
    return { id: r.id, nombre: r.nombre, departamento: r.departamento ?? '', vacios, pct };
  });

  const promedio = Math.round(resultados.reduce((s, r) => s + r.pct, 0) / resultados.length);

  const PAD_MUN  = 28;
  const PAD_DEPT = 20;
  const PAD_PCT  = 5;
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  const line = '─'.repeat(PAD_MUN + 1 + PAD_DEPT + 1 + PAD_PCT + 1 + 48);

  console.log(`\n${'═'.repeat(line.length)}`);
  console.log(`  DIAGNÓSTICO — ${label}   (${rows.length} municipios con festivales)`);
  console.log(`${'═'.repeat(line.length)}`);
  console.log(`  ${pad('MUNICIPIO', PAD_MUN)} ${pad('DEPTO', PAD_DEPT)} ${pad('%', PAD_PCT)} CAMPOS VACÍOS`);
  console.log(`  ${line}`);

  for (const r of resultados.sort((a, b) => a.pct - b.pct)) {
    const vaciosStr = r.vacios.length === 0 ? '✓ completo' : r.vacios.join(', ');
    const pctStr = `${r.pct}%`;
    console.log(`  ${pad(r.nombre, PAD_MUN)} ${pad(r.departamento, PAD_DEPT)} ${pad(pctStr, PAD_PCT)} ${vaciosStr}`);
  }

  console.log(`\n  Promedio de completitud: ${promedio}%`);

  // Resumen por campo
  const campoStats = CAMPOS_DIAG.map(c => ({
    campo: c,
    vacios: rows.filter(r => !presente(r[c])).length,
  })).sort((a, b) => b.vacios - a.vacios);

  console.log(`\n  VACÍOS POR CAMPO:`);
  for (const { campo, vacios } of campoStats) {
    const bar = '█'.repeat(Math.round((vacios / rows.length) * 20)).padEnd(20);
    console.log(`    ${campo.padEnd(22)} ${bar} ${vacios}/${rows.length}`);
  }

  return { rows, resultados, promedio };
}

// ── DANE datos.gov.co ─────────────────────────────────────────────────────
async function fetchDANE(nombre, departamento) {
  try {
    // Dataset DIVIPOLA — Marco Geoestadístico Nacional
    const { data } = await axios.get(
      'https://www.datos.gov.co/resource/gdxc-w37w.json',
      {
        params: {
          '$where': `upper(municipio) like '%${nombre.toUpperCase().replace(/'/g, "''")}%'`,
          '$limit': 10,
        },
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!Array.isArray(data) || !data.length) return null;

    const norm = s => s ? s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '') : '';
    const target = norm(nombre);
    const deptTarget = norm(departamento?.split(' ')[0] ?? '');

    const match = data.find(r => {
      const mn = norm(r.municipio || r.nombre_municipio || '');
      const dn = norm(r.departamento || r.nombre_departamento || '');
      return mn === target || (mn.includes(target) && dn.includes(deptTarget));
    }) || data[0];

    const code = match.c_digo_dane || match.codigo_dane || match.divipola || match.cod_municipio || null;
    const lat  = parseFloat(match.latitud  || match.lat || '') || null;
    const lon  = parseFloat(match.longitud || match.lon || match.lng || '') || null;

    return {
      codigo_dane: code ? String(code).replace(/\D/g, '').padStart(5, '0') : null,
      latitud:  isNaN(lat)  ? null : lat,
      longitud: isNaN(lon) ? null : lon,
    };
  } catch {
    return null;
  }
}

// ── Wikipedia REST API + MediaWiki ─────────────────────────────────────────
const WP_REST = 'https://es.wikipedia.org/api/rest_v1';
const WP_API  = 'https://es.wikipedia.org/w/api.php';

async function fetchWikipedia(nombre, departamento) {
  const result = {};

  // 1. REST API: summary (coordenadas, descripción)
  try {
    const titles = [
      `${nombre}, ${departamento}`,
      `${nombre} (${departamento})`,
      nombre,
    ];
    for (const title of titles) {
      const { data } = await axios.get(
        `${WP_REST}/page/summary/${encodeURIComponent(title)}`,
        { timeout: 8000, headers: { 'User-Agent': 'FestQuest/1.0 (festquest.app)' } }
      );
      if (data?.type === 'standard' || data?.coordinates) {
        if (data.coordinates?.lat) result._lat = data.coordinates.lat;
        if (data.coordinates?.lon) result._lon = data.coordinates.lon;
        if (data.titles?.canonical) result._wpTitle = data.titles.canonical;
        break;
      }
    }
  } catch { /* sigue */ }

  // 2. MediaWiki API: infobox del artículo (campos detallados)
  let pageContent = '';
  try {
    const queries = [
      result._wpTitle,
      `${nombre}, ${departamento}`,
      `${nombre} (${departamento})`,
      nombre,
    ].filter(Boolean);

    for (const q of queries) {
      const { data: search } = await axios.get(WP_API, {
        params: { action: 'query', list: 'search', srsearch: q, srlimit: 5, format: 'json', utf8: 1 },
        timeout: 8000,
      });
      const hits = search?.query?.search || [];
      const hit  = hits.find(h => {
        const t = h.title.toLowerCase();
        return t.includes(nombre.toLowerCase()) && !t.includes('desambiguación');
      });
      if (hit) {
        const { data: page } = await axios.get(WP_API, {
          params: { action: 'query', prop: 'revisions', titles: hit.title,
                    rvprop: 'content', rvslots: 'main', format: 'json', utf8: 1 },
          timeout: 10000,
        });
        const pages = page?.query?.pages || {};
        const pid   = Object.keys(pages)[0];
        if (pid && pid !== '-1') {
          pageContent = pages[pid]?.revisions?.[0]?.slots?.main?.['*'] || '';
          if (pageContent.length > 500) break;
        }
      }
    }
  } catch {
    return result;
  }

  if (!pageContent) return result;

  // Parsear infobox
  function getField(...aliases) {
    for (const alias of aliases) {
      const re = new RegExp(`\\|\\s*${alias}\\s*=\\s*([^\\|\\}\\n\\r]{1,150})`, 'i');
      const m  = pageContent.match(re);
      if (m) {
        const v = m[1]
          .replace(/\[\[([^\|\]]+\|)?([^\]]+)\]\]/g, '$2')
          .replace(/\{\{formatnum:([^}]+)\}\}/gi, '$1')
          .replace(/\{\{[^}]+\}\}/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/'''|''|&nbsp;|<!--.*?-->/g, '')
          .trim();
        if (v.length > 0 && v.length < 100) return v;
      }
    }
    return null;
  }

  const gent = getField('gentilicio', 'gentilicio1', 'gentilicio2');
  if (gent) {
    const limpio = gent.split(/[,\/\n]/)[0].trim();
    if (limpio.length > 1) result.gentilicio = limpio;
  }

  const alc = getField('alcalde', 'alcaldesa', 'alcalde_nombre', 'alcalde1', 'mandatario');
  if (alc) {
    const limpio = alc.split(/[\(\n]/)[0].trim();
    if (limpio.length > 3) result.alcalde = limpio;
  }

  const altStr = getField('altitud', 'altitud_media', 'elevación', 'altitud_msnm');
  if (altStr) {
    const n = parseInt(altStr.replace(/[^\d]/g, ''), 10);
    if (!isNaN(n) && n > 0 && n < 5800) result.altura = n;
  }

  const tempStr = getField('temperatura_media', 'temperatura', 'temp_media_anual');
  if (tempStr) {
    const n = parseFloat(tempStr.replace(',', '.').replace(/[^\d.]/g, ''));
    if (!isNaN(n) && n > 0 && n < 45) result.temperatura_promedio = n;
  }

  const habStr = getField('población', 'poblacion', 'población_total', 'habitantes');
  if (habStr) {
    const n = parseInt(habStr.replace(/[^\d]/g, ''), 10);
    if (!isNaN(n) && n > 100) result.habitantes = n;
  }

  // Código DANE desde infobox (a veces está como |municipio_id= o |cod_dane=)
  const daneStr = getField('municipio_id', 'cod_dane', 'código_dane', 'codigo_dane');
  if (daneStr) {
    const code = daneStr.replace(/\D/g, '').padStart(5, '0');
    if (code.length === 5) result.codigo_dane = code;
  }

  return result;
}

// ── Nominatim (coordenadas fallback) ──────────────────────────────────────
async function fetchNominatim(nombre, departamento) {
  try {
    const q = encodeURIComponent(`${nombre}, ${departamento}, Colombia`);
    const { data } = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&countrycodes=co`,
      { headers: { 'User-Agent': 'FestQuest/1.0 (festquest.app)' }, timeout: 10000 }
    );
    if (!data?.length) return null;
    const best = data.find(r =>
      ['city', 'town', 'village', 'municipality', 'administrative'].includes(r.type)
    ) || data[0];
    return { latitud: parseFloat(best.lat), longitud: parseFloat(best.lon) };
  } catch {
    return null;
  }
}

// ── Update BD ──────────────────────────────────────────────────────────────
async function updateMunicipio(id, datos) {
  const campos = Object.keys(datos).filter(k => datos[k] !== null && datos[k] !== undefined);
  if (!campos.length) return 0;
  const sets   = campos.map((c, i) => `${c} = COALESCE($${i + 1}, ${c})`).join(', ');
  const values = [...campos.map(c => datos[c]), id];
  const { rowCount } = await pool.query(
    `UPDATE municipalities SET ${sets} WHERE id = $${values.length}`,
    values
  );
  return rowCount;
}

// ── Selección ─────────────────────────────────────────────────────────────
async function getMunicipios() {
  if (ONLY_ID) {
    const { rows } = await pool.query(
      `SELECT id, nombre, departamento, codigo_dane, habitantes,
              latitud, longitud, altura, temperatura_promedio, gentilicio, alcalde
       FROM municipalities WHERE id = $1`, [ONLY_ID]
    );
    return rows;
  }

  const needsFields = SOLO_CAMPO
    ? `${SOLO_CAMPO} IS NULL`
    : `(codigo_dane IS NULL OR latitud IS NULL OR longitud IS NULL
        OR gentilicio IS NULL OR alcalde IS NULL
        OR altura IS NULL OR temperatura_promedio IS NULL
        OR habitantes IS NULL)`;

  const scope = TODOS
    ? `FROM municipalities WHERE ${needsFields}`
    : `FROM municipalities
       WHERE ${needsFields}
         AND id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)`;

  const { rows } = await pool.query(
    `SELECT id, nombre, departamento, codigo_dane, habitantes,
            latitud, longitud, altura, temperatura_promedio, gentilicio, alcalde
     ${scope} ORDER BY nombre ASC`
  );
  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const scope = TODOS ? 'todos los municipios' : 'municipios con festivales';
  console.log(`\n${'═'.repeat(72)}`);
  console.log('  FestQuest — completarMunicipios.js');
  console.log(`  Scope: ${scope}${DRY_RUN ? '  |  DRY RUN (sin cambios en BD)' : '  |  MODO APPLY'}`);
  console.log(`${'═'.repeat(72)}`);

  // ── FASE 1: Diagnóstico inicial ──────────────────────────────────────────
  const { rows: rowsAntes, promedio: promedioAntes } = await diagnostico('ANTES del enriquecimiento');

  // ── FASE 2: Enriquecimiento ──────────────────────────────────────────────
  const municipios = await getMunicipios();
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  ENRIQUECIMIENTO — ${municipios.length} municipios con campos vacíos`);
  if (DRY_RUN) console.log('  (DRY RUN: los datos se mostrarán pero NO se escribirán en BD)');
  console.log(`${'─'.repeat(72)}\n`);

  if (!municipios.length) {
    console.log('✅ No hay campos que enriquecer. Todos los municipios están completos.');
    await pool.end(); return;
  }

  let updated = 0, sinDatos = 0, errores = 0;
  const camposCompletados = {};
  CAMPOS_DIAG.forEach(c => { camposCompletados[c] = 0; });

  for (let idx = 0; idx < municipios.length; idx++) {
    const m = municipios[idx];
    process.stdout.write(
      `  [${String(idx + 1).padStart(3)}/${municipios.length}] ${m.nombre.padEnd(28)} `
    );

    const datos = {};

    // ── Wikipedia ──────────────────────────────────────────────────────────
    const needsWp = !m.gentilicio || !m.alcalde || !m.altura || !m.temperatura_promedio
                    || !m.habitantes || !m.codigo_dane;
    if (needsWp) {
      try {
        const wp = await fetchWikipedia(m.nombre, m.departamento);
        if (!m.gentilicio           && wp.gentilicio)           datos.gentilicio           = wp.gentilicio;
        if (!m.alcalde              && wp.alcalde)              datos.alcalde              = wp.alcalde;
        if (!m.altura               && wp.altura)               datos.altura               = wp.altura;
        if (!m.temperatura_promedio && wp.temperatura_promedio) datos.temperatura_promedio = wp.temperatura_promedio;
        if (!m.habitantes           && wp.habitantes)           datos.habitantes           = wp.habitantes;
        if (!m.codigo_dane          && wp.codigo_dane)          datos.codigo_dane          = wp.codigo_dane;
        // Coords desde Wikipedia REST si están disponibles
        if (!m.latitud  && wp._lat) datos.latitud  = wp._lat;
        if (!m.longitud && wp._lon) datos.longitud = wp._lon;
      } catch { /* sigue */ }
      await delay(DELAY_WP);
    }

    // ── DANE datos.gov.co ──────────────────────────────────────────────────
    if (!m.codigo_dane && !datos.codigo_dane) {
      try {
        const dane = await fetchDANE(m.nombre, m.departamento);
        if (dane?.codigo_dane) datos.codigo_dane = dane.codigo_dane;
        if (!datos.latitud  && dane?.latitud)  datos.latitud  = dane.latitud;
        if (!datos.longitud && dane?.longitud) datos.longitud = dane.longitud;
      } catch { /* sigue */ }
      await delay(DELAY_DANE);
    }

    // ── Nominatim (coords fallback) ────────────────────────────────────────
    if (!m.latitud && !m.longitud && !datos.latitud) {
      try {
        const coords = await fetchNominatim(m.nombre, m.departamento);
        if (coords) {
          datos.latitud  = coords.latitud;
          datos.longitud = coords.longitud;
        }
      } catch { /* sigue */ }
      await delay(DELAY_NOMINATIM);
    }

    const encontrados = Object.keys(datos).filter(k => !k.startsWith('_'));
    if (!encontrados.length) {
      console.log('—');
      sinDatos++;
      continue;
    }

    // Registrar campos completados
    encontrados.forEach(k => { if (k in camposCompletados) camposCompletados[k]++; });

    const resumen = encontrados.map(k => {
      const v = String(datos[k]).slice(0, 18);
      return `${k}=${v}`;
    }).join(', ');
    console.log(resumen);

    if (!DRY_RUN) {
      try {
        const r = await updateMunicipio(m.id, datos);
        if (r > 0) updated++;
        else errores++;
      } catch (e) {
        console.log(`    ❌ BD error: ${e.message}`);
        errores++;
      }
    } else {
      updated++;
    }
  }

  // ── FASE 3: Diagnóstico final ────────────────────────────────────────────
  if (!DRY_RUN) {
    const { promedio: promedioDespues } = await diagnostico('DESPUÉS del enriquecimiento');
    const delta = promedioDespues - promedioAntes;
    console.log(`\n  📈 Mejora de completitud: ${promedioAntes}% → ${promedioDespues}% (+${delta}%)`);
  }

  // ── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(72)}`);
  console.log('  RESUMEN FINAL');
  console.log(`${'═'.repeat(72)}`);
  console.log(`  ✅ Municipios con datos nuevos : ${updated}`);
  console.log(`  —  Sin datos nuevos            : ${sinDatos}`);
  if (errores) console.log(`  ❌ Errores de BD               : ${errores}`);
  if (DRY_RUN) console.log('  ℹ️  DRY RUN — sin cambios en BD');

  console.log('\n  CAMPOS COMPLETADOS (esta ejecución):');
  const totalesCompletados = Object.entries(camposCompletados)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (totalesCompletados.length) {
    totalesCompletados.forEach(([campo, n]) => {
      console.log(`    ${campo.padEnd(24)} +${n}`);
    });
  } else {
    console.log('    (ninguno)');
  }

  // Campos aún pendientes (para carga manual)
  const { rows: rowsFinal } = await pool.query(`
    SELECT nombre, departamento,
           gentilicio IS NULL AS sin_gentilicio,
           alcalde IS NULL AS sin_alcalde,
           codigo_dane IS NULL AS sin_dane,
           altura IS NULL AS sin_altura,
           temperatura_promedio IS NULL AS sin_temp,
           habitantes IS NULL AS sin_hab,
           latitud IS NULL AS sin_coords
    FROM municipalities
    WHERE id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
    ORDER BY nombre ASC
  `);

  const pendientes = rowsFinal.filter(r =>
    r.sin_gentilicio || r.sin_alcalde || r.sin_dane ||
    r.sin_altura || r.sin_temp || r.sin_hab || r.sin_coords
  );

  if (pendientes.length) {
    console.log(`\n  PENDIENTES PARA CARGA MANUAL (${pendientes.length} municipios):`);
    for (const r of pendientes) {
      const faltantes = [
        r.sin_gentilicio && 'gentilicio',
        r.sin_alcalde    && 'alcalde',
        r.sin_dane       && 'codigo_dane',
        r.sin_altura     && 'altura',
        r.sin_temp       && 'temperatura',
        r.sin_hab        && 'habitantes',
        r.sin_coords     && 'coords',
      ].filter(Boolean);
      console.log(`    ${r.nombre.padEnd(28)} ${faltantes.join(', ')}`);
    }
  } else {
    console.log('\n  ✅ Todos los campos básicos están completos');
  }

  console.log(`${'═'.repeat(72)}\n`);

  await pool.end();
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); pool.end(); process.exit(1); });
