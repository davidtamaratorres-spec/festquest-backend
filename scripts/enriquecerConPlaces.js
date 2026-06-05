require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DELAY_MS = 200;

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Google Places helpers ──────────────────────────────────────────────────

async function textSearch(query) {
  const { data } = await axios.get(
    'https://maps.googleapis.com/maps/api/place/textsearch/json',
    { params: { query, key: API_KEY } }
  );
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status} — ${data.error_message || ''}`);
  }
  return data.results || [];
}

async function placeDetails(placeId) {
  const { data } = await axios.get(
    'https://maps.googleapis.com/maps/api/place/details/json',
    { params: { place_id: placeId, fields: 'formatted_phone_number', key: API_KEY } }
  );
  return data.result || {};
}

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function waLink(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  let num = digits;
  if (num.startsWith('57')) num = num.slice(2);
  if (num.startsWith('0')) num = num.slice(1);
  if (num.length < 7) return '';
  return `https://wa.me/57${num}`;
}

// ── Selección de municipios ────────────────────────────────────────────────

async function getMunicipios() {
  const { rows } = await pool.query(`
    WITH festival_counts AS (
      SELECT
        m.id, m.nombre, m.departamento,
        COUNT(f.id) AS num_festivales
      FROM municipalities m
      LEFT JOIN festivals f
        ON f.municipio_id = m.id AND f.is_active IS NOT FALSE
      WHERE m.departamento IS NOT NULL AND m.nombre IS NOT NULL
      GROUP BY m.id, m.nombre, m.departamento
    ),
    ranked AS (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY departamento
          ORDER BY num_festivales DESC, nombre ASC
        ) AS rn
      FROM festival_counts
    )
    SELECT id, nombre, departamento, num_festivales::int
    FROM ranked
    WHERE rn <= 2
    ORDER BY departamento, num_festivales DESC
  `);

  // Asegurar Villavicencio
  const hasVillavicencio = rows.some(r => r.nombre.toLowerCase().includes('villavicencio'));
  if (!hasVillavicencio) {
    const { rows: vv } = await pool.query(`
      SELECT m.id, m.nombre, m.departamento, COUNT(f.id)::int AS num_festivales
      FROM municipalities m
      LEFT JOIN festivals f ON f.municipio_id = m.id
      WHERE m.nombre ILIKE '%villavicencio%'
      GROUP BY m.id, m.nombre, m.departamento
      LIMIT 1
    `);
    if (vv.length) rows.push(vv[0]);
  }

  return rows;
}

// ── Proceso por municipio ──────────────────────────────────────────────────

async function processMunicipio(m) {
  const { nombre, departamento } = m;
  const result = { nombre, departamento, sitios: [], hoteles: [] };

  // Sitios turísticos
  const sitioResults = await textSearch(`sitios turisticos ${nombre} ${departamento} Colombia`);
  await delay(DELAY_MS);

  for (const place of sitioResults.slice(0, 3)) {
    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;
    result.sitios.push({
      nombre: place.name,
      maps: lat != null && lng != null ? mapsLink(lat, lng) : ''
    });
  }

  // Hoteles
  const hotelResults = await textSearch(`hoteles ${nombre} ${departamento} Colombia`);
  await delay(DELAY_MS);

  for (const place of hotelResults.slice(0, 3)) {
    let phone = '';
    if (place.place_id) {
      try {
        const details = await placeDetails(place.place_id);
        phone = details.formatted_phone_number || '';
        await delay(DELAY_MS);
      } catch (_) { /* sin teléfono */ }
    }
    result.hoteles.push({ nombre: place.name, wa: waLink(phone) });
  }

  return result;
}

// ── Preview ────────────────────────────────────────────────────────────────

function printPreview(data) {
  console.log('\n' + '═'.repeat(60));
  console.log('PREVIEW — primeros 5 municipios procesados');
  console.log('═'.repeat(60));
  for (const r of data) {
    console.log(`\n📍 ${r.nombre} — ${r.departamento}`);
    if (r.sitios.length) {
      r.sitios.forEach((s, i) =>
        console.log(`   Sitio ${i + 1}: ${s.nombre}\n            ${s.maps || '(sin coords)'}`)
      );
    } else {
      console.log('   (sin sitios encontrados)');
    }
    if (r.hoteles.length) {
      r.hoteles.forEach((h, i) =>
        console.log(`   Hotel ${i + 1}: ${h.nombre}\n            ${h.wa || '(sin teléfono)'}`)
      );
    } else {
      console.log('   (sin hoteles encontrados)');
    }
  }
  console.log('\n' + '═'.repeat(60) + '\n');
}

// ── CSV ────────────────────────────────────────────────────────────────────

function saveCsv(allData) {
  const csvPath = path.join(__dirname, '../data/places_enriquecidos.csv');
  const esc = v => `"${String(v || '').replace(/"/g, '""')}"`;
  const header = 'municipio,departamento,sitio_1,maps_1,sitio_2,maps_2,sitio_3,maps_3,hotel_1,wa_1,hotel_2,wa_2,hotel_3,wa_3';
  const lines = [header];
  for (const r of allData) {
    const s = i => esc(r.sitios[i]?.nombre || '');
    const mp = i => esc(r.sitios[i]?.maps || '');
    const h = i => esc(r.hoteles[i]?.nombre || '');
    const w = i => esc(r.hoteles[i]?.wa || '');
    lines.push(
      [esc(r.nombre), esc(r.departamento),
       s(0), mp(0), s(1), mp(1), s(2), mp(2),
       h(0), w(0), h(1), w(1), h(2), w(2)].join(',')
    );
  }
  fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
  console.log(`✅ CSV guardado → ${csvPath}`);
}

// ── Update BD ──────────────────────────────────────────────────────────────

async function updateDb(r) {
  const s = i => r.sitios[i]?.nombre || null;
  const mp = i => r.sitios[i]?.maps || null;
  const h = i => r.hoteles[i]?.nombre || null;
  const w = i => r.hoteles[i]?.wa || null;

  const { rowCount } = await pool.query(
    `UPDATE municipalities SET
       sitio_1 = COALESCE($1,  sitio_1),
       maps_1  = COALESCE($2,  maps_1),
       sitio_2 = COALESCE($3,  sitio_2),
       maps_2  = COALESCE($4,  maps_2),
       sitio_3 = COALESCE($5,  sitio_3),
       maps_3  = COALESCE($6,  maps_3),
       hotel_1 = COALESCE($7,  hotel_1),
       wa_1    = COALESCE($8,  wa_1),
       hotel_2 = COALESCE($9,  hotel_2),
       wa_2    = COALESCE($10, wa_2),
       hotel_3 = COALESCE($11, hotel_3),
       wa_3    = COALESCE($12, wa_3),
       fecha_actualizacion = NOW()
     WHERE nombre ILIKE $13 AND departamento ILIKE $14`,
    [s(0), mp(0), s(1), mp(1), s(2), mp(2),
     h(0), w(0), h(1), w(1), h(2), w(2),
     r.nombre, r.departamento]
  );
  return rowCount;
}

// ── Municipios con sitio_1 NULL (para retry) ──────────────────────────────

async function getFailedMunicipios() {
  const todos = await getMunicipios();
  const ids = todos.map(m => m.id);
  const { rows } = await pool.query(
    `SELECT id, nombre, departamento, 0::int AS num_festivales
     FROM municipalities
     WHERE id = ANY($1) AND sitio_1 IS NULL`,
    [ids]
  );
  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const retryFailed = process.argv.includes('--retry-failed');

  console.log('🗺️  FestQuest — Enriquecimiento con Google Places API');
  if (retryFailed) console.log('🔄 Modo: retry de municipios sin datos (sitio_1 IS NULL)');
  console.log(`🔑 API key: ${API_KEY ? API_KEY.slice(0, 10) + '...' : '❌ no encontrada'}\n`);

  if (!API_KEY) {
    console.error('ERROR: GOOGLE_PLACES_API_KEY no definida en .env');
    process.exit(1);
  }

  let municipios;
  if (retryFailed) {
    municipios = await getFailedMunicipios();
    console.log(`📋 ${municipios.length} municipios sin datos (sitio_1 IS NULL):\n`);
    municipios.forEach(m =>
      console.log(`   · ${m.nombre.padEnd(25)} ${m.departamento}`)
    );

    if (municipios.length === 0) {
      console.log('✅ Ningún municipio pendiente. Todo está enriquecido.');
      await pool.end();
      return;
    }

    console.log('\n⏳ Reintentando con 1s de delay entre llamadas...\n');
    const allData = [];
    for (const m of municipios) {
      process.stdout.write(`   → ${m.nombre} (${m.departamento})... `);
      try {
        const result = await processMunicipio(m);
        allData.push(result);
        console.log('✓');
      } catch (err) {
        console.log(`✗ (${err.message})`);
        allData.push({ nombre: m.nombre, departamento: m.departamento, sitios: [], hoteles: [] });
      }
      await delay(1000);
    }

    console.log('\n💾 Guardando CSV de respaldo...');
    saveCsv(allData);

    console.log('\n⏳ Actualizando BD...');
    let updated = 0, skipped = 0;
    for (const r of allData) {
      const rowCount = await updateDb(r);
      if (rowCount > 0) updated++;
      else skipped++;
      process.stdout.write(`\r   ${updated + skipped}/${allData.length} — ${updated} actualizados, ${skipped} sin match`);
    }

    console.log(`\n\n✅ Listo — ${updated} municipios enriquecidos en BD`);
    if (skipped) console.log(`⚠️  ${skipped} sin match en BD`);
    await pool.end();
    return;
  }

  municipios = await getMunicipios();
  console.log(`📋 ${municipios.length} municipios seleccionados:\n`);
  municipios.forEach(m =>
    console.log(`   · ${m.nombre.padEnd(20)} ${m.departamento.padEnd(25)} ${m.num_festivales} festivales`)
  );

  // Preview: primeros 5
  console.log('\n⏳ Procesando primeros 5 para preview...');
  const preview = [];
  for (const m of municipios.slice(0, 5)) {
    process.stdout.write(`   → ${m.nombre}... `);
    try {
      const result = await processMunicipio(m);
      preview.push(result);
      console.log('✓');
    } catch (err) {
      console.log(`✗ (${err.message})`);
      preview.push({ nombre: m.nombre, departamento: m.departamento, sitios: [], hoteles: [] });
    }
  }

  printPreview(preview);

  // Resto
  console.log('⏳ Procesando municipios restantes...\n');
  const allData = [...preview];
  for (const m of municipios.slice(5)) {
    process.stdout.write(`   → ${m.nombre} (${m.departamento})... `);
    try {
      const result = await processMunicipio(m);
      allData.push(result);
      console.log('✓');
    } catch (err) {
      console.log(`✗ (${err.message})`);
      allData.push({ nombre: m.nombre, departamento: m.departamento, sitios: [], hoteles: [] });
    }
  }

  // CSV
  console.log('\n💾 Guardando CSV de respaldo...');
  saveCsv(allData);

  // UPDATE masivo
  console.log('\n⏳ Actualizando BD...');
  let updated = 0, skipped = 0;
  for (const r of allData) {
    const rowCount = await updateDb(r);
    if (rowCount > 0) updated++;
    else skipped++;
    process.stdout.write(`\r   ${updated + skipped}/${allData.length} — ${updated} actualizados, ${skipped} sin match`);
  }

  console.log(`\n\n✅ Listo — ${updated} municipios enriquecidos en BD`);
  if (skipped) console.log(`⚠️  ${skipped} sin match en BD (revisar nombres/departamentos)`);

  await pool.end();
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  pool.end();
  process.exit(1);
});
