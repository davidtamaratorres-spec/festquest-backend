/**
 * completarSitiosHoteles.js
 *
 * Rellena sitio_1-3 / maps_1-3 / hotel_1-3 en municipalities
 * usando Google Places Text Search API.
 *
 * Por cada municipio sin sitios:
 *   → Text Search "atractivos turísticos [municipio] [departamento] Colombia"
 *   → Top 3 resultados → sitio_1-3 + maps_1-3 (place_id URL)
 *
 * Por cada municipio sin hoteles:
 *   → Text Search "hoteles [municipio] [departamento] Colombia"
 *   → Top 3 resultados → hotel_1-3
 *
 * Uso:
 *   node completarSitiosHoteles.js             → dry-run
 *   node completarSitiosHoteles.js --apply     → escribe en BD
 *   node completarSitiosHoteles.js --id 42     → solo ese municipio
 *   node completarSitiosHoteles.js --limite 50 → procesa primero N municipios
 *   node completarSitiosHoteles.js --solo sitios   → solo campo sitios
 *   node completarSitiosHoteles.js --solo hoteles  → solo campo hoteles
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = !process.argv.includes('--apply');
const ONLY_ID = (() => { const i = process.argv.indexOf('--id');     return i !== -1 ? parseInt(process.argv[i+1], 10) : null; })();
const LIMITE  = (() => { const i = process.argv.indexOf('--limite'); return i !== -1 ? parseInt(process.argv[i+1], 10) : 9999; })();
const SOLO    = (() => { const i = process.argv.indexOf('--solo');   return i !== -1 ? process.argv[i+1] : null; })();

const D_PLACES = 200;  // ms entre llamadas (Places API no tiene rate limit estricto)
const sleep    = ms => new Promise(r => setTimeout(r, ms));
const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

if (!API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY no está en .env');
  process.exit(1);
}

// ── Buscar lugares en Google Places ──────────────────────────────────────
async function searchPlaces(query, maxResults = 3) {
  try {
    const { data } = await axios.get(PLACES_URL, {
      params: { query, key: API_KEY, language: 'es' },
      timeout: 10000,
    });
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API: ${data.status}`);
    }
    return (data.results || []).slice(0, maxResults).map(r => ({
      nombre:   r.name,
      place_id: r.place_id,
      maps_url: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
      rating:   r.rating || null,
      address:  r.formatted_address || null,
    }));
  } catch (e) {
    return [];
  }
}

// ── Obtener municipios a procesar ─────────────────────────────────────────
async function getMunicipios() {
  if (ONLY_ID) {
    const { rows } = await pool.query(
      `SELECT id, nombre, departamento, sitio_1, hotel_1
       FROM municipalities WHERE id = $1`, [ONLY_ID]
    );
    return rows;
  }

  const needsSitios  = `(sitio_1 IS NULL OR TRIM(sitio_1) = '')`;
  const needsHoteles = `(hotel_1 IS NULL OR TRIM(hotel_1) = '')`;
  const needs = SOLO === 'sitios'  ? needsSitios
              : SOLO === 'hoteles' ? needsHoteles
              : `(${needsSitios} OR ${needsHoteles})`;

  const { rows } = await pool.query(`
    SELECT id, nombre, departamento, sitio_1, hotel_1
    FROM municipalities
    WHERE ${needs}
      AND id IN (SELECT DISTINCT municipio_id FROM festivals WHERE municipio_id IS NOT NULL)
    ORDER BY nombre ASC
    LIMIT $1
  `, [LIMITE]);
  return rows;
}

// ── Update BD ─────────────────────────────────────────────────────────────
async function updateMunicipio(id, datos) {
  const campos = Object.keys(datos).filter(k => datos[k] !== null && datos[k] !== undefined);
  if (!campos.length) return 0;
  const sets   = campos.map((c, i) => `${c} = $${i+1}`).join(', ');
  const values = [...campos.map(c => datos[c]), id];
  const { rowCount } = await pool.query(
    `UPDATE municipalities SET ${sets} WHERE id = $${values.length}`,
    values
  );
  return rowCount;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(72));
  console.log('  FestQuest — completarSitiosHoteles.js (Google Places API)');
  console.log(`  ${DRY_RUN ? 'DRY RUN' : 'MODO APPLY'}${SOLO ? `  |  solo: ${SOLO}` : ''}`);
  console.log('═'.repeat(72));

  const municipios = await getMunicipios();
  console.log(`\n  Municipios a procesar: ${municipios.length}\n`);

  if (!municipios.length) {
    console.log('  ✅ No hay municipios pendientes.');
    await pool.end(); return;
  }

  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  let actualizados = 0, sinDatos = 0, errores = 0;
  let totalSitios = 0, totalHoteles = 0;

  for (let i = 0; i < municipios.length; i++) {
    const m = municipios[i];
    const loc = m.departamento
      ? `${m.nombre}, ${m.departamento}, Colombia`
      : `${m.nombre}, Colombia`;

    process.stdout.write(`  [${String(i+1).padStart(3)}/${municipios.length}] ${pad(m.nombre, 28)} `);

    const datos = {};

    // ── Sitios turísticos ────────────────────────────────────────────────
    if ((!m.sitio_1 || SOLO === 'sitios') && SOLO !== 'hoteles') {
      await sleep(D_PLACES);
      const sitios = await searchPlaces(
        `atractivos turísticos ${loc}`,
        3
      );
      if (sitios[0]) { datos.sitio_1 = sitios[0].nombre; datos.maps_1 = sitios[0].maps_url; }
      if (sitios[1]) { datos.sitio_2 = sitios[1].nombre; datos.maps_2 = sitios[1].maps_url; }
      if (sitios[2]) { datos.sitio_3 = sitios[2].nombre; datos.maps_3 = sitios[2].maps_url; }
      if (sitios.length > 0) totalSitios++;
    }

    // ── Hoteles ───────────────────────────────────────────────────────────
    if ((!m.hotel_1 || SOLO === 'hoteles') && SOLO !== 'sitios') {
      await sleep(D_PLACES);
      const hoteles = await searchPlaces(
        `hoteles hospedaje ${loc}`,
        3
      );
      if (hoteles[0]) { datos.hotel_1 = hoteles[0].nombre; }
      if (hoteles[1]) { datos.hotel_2 = hoteles[1].nombre; }
      if (hoteles[2]) { datos.hotel_3 = hoteles[2].nombre; }
      if (hoteles.length > 0) totalHoteles++;
    }

    const encontrados = Object.keys(datos).length;

    if (!encontrados) {
      console.log('—');
      sinDatos++;
      continue;
    }

    // Preview resumido
    const preview = [
      datos.sitio_1 ? `sitio="${datos.sitio_1.slice(0,25)}"` : null,
      datos.hotel_1 ? `hotel="${datos.hotel_1.slice(0,25)}"` : null,
    ].filter(Boolean).join('  ');
    console.log(preview || `(${encontrados} campos)`);

    if (!DRY_RUN) {
      try {
        const r = await updateMunicipio(m.id, datos);
        if (r > 0) actualizados++;
        else errores++;
      } catch (e) {
        console.log(`    ❌ BD: ${e.message}`);
        errores++;
      }
    } else {
      actualizados++;
    }
  }

  // Resumen
  console.log('\n' + '═'.repeat(72));
  console.log('  RESUMEN FINAL');
  console.log('═'.repeat(72));
  console.log(`  ✅ Municipios con datos nuevos : ${actualizados}`);
  console.log(`  —  Sin resultados Places API   : ${sinDatos}`);
  if (errores) console.log(`  ❌ Errores                     : ${errores}`);
  console.log(`  🗺️  Con sitios turísticos       : ${totalSitios}`);
  console.log(`  🏨  Con hoteles                 : ${totalHoteles}`);
  if (DRY_RUN) console.log('  ℹ️  DRY RUN — sin cambios en BD');
  console.log('═'.repeat(72) + '\n');

  await pool.end();
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); pool.end(); process.exit(1); });
