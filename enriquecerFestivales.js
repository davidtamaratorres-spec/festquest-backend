/**
 * enriquecerFestivales.js
 * Busca descripciones reales en Wikipedia (es.wikipedia.org) para festivales
 * que no tienen descripción en la BD. NO inventa datos: si Wikipedia no tiene
 * un artículo verificable sobre el festival, deja el campo en NULL.
 */
require('dotenv').config();
const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── HTTP helper ────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'FestQuestBot/1.0 (festquest.app; info@festquest.app)',
        'Accept': 'application/json',
      },
    }, res => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Wikipedia helpers ───────────────────────────────────────────────────────

// Busca artículos en Wikipedia ES
async function wikiSearch(query) {
  const q = encodeURIComponent(query);
  const url = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&utf8=&format=json&srlimit=5&srprop=snippet`;
  const { body } = await fetchJSON(url);
  return body?.query?.search ?? [];
}

// Obtiene el extracto de un artículo de Wikipedia ES
async function wikiSummary(title) {
  const t = encodeURIComponent(title);
  const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${t}`;
  const { status, body } = await fetchJSON(url);
  if (status !== 200 || !body) return null;
  if (body.type === 'disambiguation') return null;
  if (!body.extract || body.extract.length < 60) return null;
  // Solo el primer párrafo
  const primer = body.extract.split('\n').find(p => p.trim().length > 60) ?? '';
  return primer.trim() || null;
}

// ─── Lógica de búsqueda y verificación ──────────────────────────────────────

const normalize = s => s.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Palabras genéricas que no sirven para matching
const STOP_WORDS = new Set([
  'festival','feria','fiesta','fiestas','carnaval','semana','encuentro',
  'nacional','internacional','colombia','colombiano','colombiana',
  'gran','gran','dias','dias','anual','tradicional',
]);

// Tipos de artículo que NO son festivales
const TIPOS_INVALIDOS = ['disambiguation'];
// Palabras que indican que el artículo NO es sobre un festival
const INDICADORES_INVALIDOS = [
  'película','film','filme','actor','actriz','director','novela','libro',
  'municipio','corregimiento','vereda','barrio','ciudad','pueblo',
];
// Palabras que indican que el artículo SÍ es sobre un festival/evento
const INDICADORES_EVENTO = [
  'festival','feria','fiesta','fiestas','carnaval','celebración','celebracion',
  'evento','celebra','reúne','reune','edición','edicion','anualmente',
  'folclórico','folclorico','cultural','tradicional','música','musica',
];

function scoreMatch(festivalNombre, wikiTitle) {
  const palabras = normalize(festivalNombre)
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  if (palabras.length === 0) return 0;
  const titulo = normalize(wikiTitle);
  return palabras.filter(w => titulo.includes(w)).length / palabras.length;
}

function extractoEsValido(extracto, municipio, departamento) {
  if (!extracto) return false;
  const texto = normalize(extracto);

  // Rechazar si parece un artículo sobre película, municipio, etc.
  if (INDICADORES_INVALIDOS.some(p => texto.includes(p))) return false;

  // Requerir que el texto mencione al menos una palabra de evento
  if (!INDICADORES_EVENTO.some(p => texto.includes(p))) return false;

  // Requerir que mencione Colombia O el municipio O el departamento
  const lugarOk = texto.includes('colombia')
    || texto.includes(normalize(municipio))
    || texto.includes(normalize(departamento));
  if (!lugarOk) return false;

  return true;
}

async function buscarDescripcion(nombre, municipio, departamento) {
  const queries = [
    `${nombre} ${municipio} Colombia`,
    `${nombre} ${departamento} Colombia`,
    `"${nombre}" Colombia festival`,
  ];

  for (const query of queries) {
    const resultados = await wikiSearch(query);
    await sleep(250);

    for (const r of resultados) {
      // El título del artículo debe contener palabras clave del festival
      const score = scoreMatch(nombre, r.title);
      if (score < 0.5) continue;

      const extracto = await wikiSummary(r.title);
      await sleep(250);

      if (!extracto) continue;

      // Validar que el extracto sea sobre un festival real en ese lugar
      if (!extractoEsValido(extracto, municipio, departamento)) continue;

      return {
        descripcion: extracto.length > 600 ? extracto.substring(0, 597) + '...' : extracto,
        fuente: `Wikipedia ES: "${r.title}"`,
        score: Math.round(score * 100),
      };
    }
  }

  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const LIMITE = parseInt(process.argv[2] ?? '10', 10);

  const client = await pool.connect();

  const { rows: festivales } = await client.query(
    `SELECT id, nombre, municipio, departamento
     FROM festivals
     WHERE (descripcion IS NULL OR TRIM(descripcion) = '')
       AND is_active = true
     ORDER BY fecha_inicio ASC NULLS LAST, id ASC
     LIMIT $1`,
    [LIMITE]
  );

  console.log(`\n🔍 Buscando descripciones para ${festivales.length} festivales (límite: ${LIMITE})\n`);
  console.log('─'.repeat(70));

  let encontrados = 0;
  let sinInfo     = 0;
  let errores     = 0;

  for (const f of festivales) {
    console.log(`\n📌 "${f.nombre}"`);
    console.log(`   ${f.municipio} · ${f.departamento}`);

    try {
      const resultado = await buscarDescripcion(f.nombre, f.municipio, f.departamento);

      if (resultado) {
        await client.query(
          'UPDATE festivals SET descripcion = $1 WHERE id = $2',
          [resultado.descripcion, f.id]
        );
        console.log(`   ✅ Encontrado (score: ${resultado.score}%)`);
        console.log(`   📖 Fuente: ${resultado.fuente}`);
        console.log(`   📝 "${resultado.descripcion.substring(0, 130)}..."`);
        encontrados++;
      } else {
        console.log(`   ⚪ Sin artículo verificable en Wikipedia — descripción queda NULL`);
        sinInfo++;
      }
    } catch (err) {
      console.log(`   ❌ Error de red: ${err.message}`);
      errores++;
    }

    await sleep(400); // Pausa respetuosa entre festivales
  }

  console.log('\n' + '═'.repeat(70));
  console.log('RESUMEN');
  console.log('═'.repeat(70));
  console.log(`  ✅ Con descripción de Wikipedia : ${encontrados}`);
  console.log(`  ⚪ Sin información verificable  : ${sinInfo}`);
  if (errores > 0) console.log(`  ❌ Errores de red              : ${errores}`);
  console.log('');

  client.release();
  await pool.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
