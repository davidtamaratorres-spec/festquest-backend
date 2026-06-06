// Test rápido: Nominatim + Wikipedia REST para 5 municipios grandes
require('dotenv').config();
const axios = require('axios');

const tests = [
  { nombre: 'Cali', departamento: 'Valle Del Cauca' },
  { nombre: 'Ibagué', departamento: 'Tolima' },
  { nombre: 'Leticia', departamento: 'Amazonas' },
  { nombre: 'Barichara', departamento: 'Santander' },
  { nombre: 'Charalá', departamento: 'Santander' },
];

const delay = ms => new Promise(r => setTimeout(r, ms));

async function testNominatim(nombre, departamento) {
  try {
    const q = encodeURIComponent(`${nombre}, ${departamento}, Colombia`);
    const { data, status } = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&countrycodes=co`,
      { headers: { 'User-Agent': 'FestQuest/1.0 (festquest.app)' }, timeout: 10000 }
    );
    return { source: 'Nominatim', status, count: data.length, coords: data[0] ? `${data[0].lat},${data[0].lon}` : null };
  } catch(e) {
    return { source: 'Nominatim', error: e.message };
  }
}

async function testWikiREST(nombre, departamento) {
  try {
    const titles = [`${nombre}, ${departamento}`, nombre];
    for (const title of titles) {
      const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const { data, status } = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'FestQuest/1.0 (festquest.app)' }
      });
      if (data?.coordinates) {
        return { source: `WikiREST(${title})`, status, coords: `${data.coordinates.lat},${data.coordinates.lon}` };
      }
    }
    return { source: 'WikiREST', result: 'no coordinates in page' };
  } catch(e) {
    return { source: 'WikiREST', error: e.code || e.message };
  }
}

async function main() {
  console.log('\nTest APIs: Nominatim + Wikipedia REST\n');
  for (const { nombre, departamento } of tests) {
    console.log(`── ${nombre} (${departamento})`);
    const wikiRes = await testWikiREST(nombre, departamento);
    console.log('   WikiREST:', JSON.stringify(wikiRes));
    const nomRes = await testNominatim(nombre, departamento);
    console.log('   Nominatim:', JSON.stringify(nomRes));
    await delay(1200);
    console.log('');
  }
}

main().catch(console.error);
