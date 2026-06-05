/**
 * enriquecerMunicipios.js
 *
 * Genera sitios_turisticos y hoteles para municipios con festivales
 * activos que aún no tienen esos datos, usando Claude Haiku 4.5.
 *
 * USO:
 *   node enriquecerMunicipios.js           → preview primeros 10
 *   node enriquecerMunicipios.js --apply   → preview + UPDATE masivo (hasta 100)
 *   node enriquecerMunicipios.js --apply --limite 50  → limitar a 50 municipios
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

// ─── Config ─────────────────────────────────────────────────────────────────

const MODEL        = 'claude-haiku-4-5';
const PREVIEW_N    = 10;
const DEFAULT_LOTE = 100;
const BATCH_SIZE   = 20;   // llamadas paralelas por lote
const DELAY_MS     = 150;  // pausa entre peticiones dentro de un batch

// ─── Init ────────────────────────────────────────────────────────────────────

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const claude = new Anthropic.default();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── DB ──────────────────────────────────────────────────────────────────────

async function getMunicipios(limite) {
  const { rows } = await db.query(`
    SELECT
      m.id,
      m.nombre,
      m.departamento,
      COUNT(f.id) AS festival_count
    FROM municipalities m
    JOIN festivals f ON f.municipio_id = m.id
    WHERE (m.sitios_turisticos IS NULL OR TRIM(m.sitios_turisticos) = '')
    GROUP BY m.id, m.nombre, m.departamento
    ORDER BY festival_count DESC, m.nombre ASC
    LIMIT $1
  `, [limite]);
  return rows;
}

async function updateMunicipio(id, sitios, hoteles) {
  await db.query(
    `UPDATE municipalities
     SET sitios_turisticos = $1,
         hoteles           = $2
     WHERE id = $3`,
    [sitios || null, hoteles || null, id]
  );
}

// ─── Claude ──────────────────────────────────────────────────────────────────

async function callClaude(municipio) {
  const { nombre, departamento } = municipio;

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Para el municipio de ${nombre} en ${departamento}, Colombia.

Responde ÚNICAMENTE con este formato exacto, sin ningún texto adicional:
SITIOS: sitio1|sitio2|sitio3
HOTELES: hotel1|hotel2

Reglas estrictas:
- Sitios turísticos: 3 a 5, reales y conocidos en ese municipio (parques, iglesias, ríos, museos, plazas, reservas)
- Hoteles: 2 a 3 hoteles que existan en ese municipio; si no hay hoteles conocidos escribe HOTELES:
- Usar solo el nombre del sitio/hotel, sin explicación ni artículo
- Separar con | sin espacios alrededor
- Sin comillas, sin puntos, sin otros caracteres`,
    }],
  });

  const text = (response.content[0]?.type === 'text' ? response.content[0].text : '').trim();

  const sitiosM  = text.match(/SITIOS:\s*(.+)/);
  const hotelesM = text.match(/HOTELES:\s*(.*)/);

  const sitios  = (sitiosM  ? sitiosM[1].trim()  : '').replace(/\s*\|\s*/g, '|');
  const hoteles = (hotelesM ? hotelesM[1].trim() : '').replace(/\s*\|\s*/g, '|');

  return { sitios, hoteles, raw: text };
}

// ─── Helpers de output ───────────────────────────────────────────────────────

function line(char = '─', len = 65) { return char.repeat(len); }

function printResult(i, total, municipio, result) {
  const ok = !result.error;
  const bullet = ok ? '✅' : '❌';
  console.log(`\n[${i}/${total}] ${bullet} ${municipio.nombre}, ${municipio.departamento} (${municipio.festival_count} festivales)`);
  if (ok) {
    console.log(`  SITIOS:  ${result.sitios  || '(vacío)'}`);
    console.log(`  HOTELES: ${result.hoteles || '(vacío)'}`);
  } else {
    console.log(`  ERROR: ${result.error}`);
  }
}

// ─── Procesar un municipio ────────────────────────────────────────────────────

async function enrichOne(municipio) {
  try {
    const r = await callClaude(municipio);
    return { ...r, error: null };
  } catch (err) {
    return { sitios: '', hoteles: '', raw: '', error: err.message };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const doApply = args.includes('--apply');
  const limiteIdx = args.indexOf('--limite');
  const limite  = limiteIdx !== -1 ? parseInt(args[limiteIdx + 1], 10) : DEFAULT_LOTE;

  console.log(line('═'));
  console.log('  FestQuest — Enriquecimiento de Municipios con IA');
  console.log(`  Modelo: ${MODEL}  |  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌ NO CONFIGURADA'}`);
  console.log(line('═'));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ Falta ANTHROPIC_API_KEY en .env');
    process.exit(1);
  }

  // ── Obtener municipios ──
  console.log('\n🔍 Consultando municipios sin datos turísticos...');
  const municipios = await getMunicipios(limite);
  console.log(`   → ${municipios.length} municipios encontrados (máx ${limite}, ordenados por # festivales)\n`);

  if (!municipios.length) {
    console.log('✅ Todos los municipios ya tienen sitios turísticos. Nada que hacer.');
    await db.end(); return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FASE 1: PREVIEW — primeros N municipios
  // ─────────────────────────────────────────────────────────────────────────
  const previewList = municipios.slice(0, PREVIEW_N);

  console.log(line());
  console.log(`  PREVIEW — generando datos para los primeros ${previewList.length} municipios`);
  console.log(line());

  const previewResults = [];

  for (let i = 0; i < previewList.length; i++) {
    const m = previewList[i];
    process.stdout.write(`  [${i+1}/${previewList.length}] ${m.nombre}... `);
    const result = await enrichOne(m);
    previewResults.push({ municipio: m, ...result });
    process.stdout.write(result.error ? '❌\n' : '✅\n');
    if (i < previewList.length - 1) await sleep(DELAY_MS);
  }

  // Mostrar resultados del preview
  console.log(`\n${line('─')}`);
  console.log('  RESULTADOS DEL PREVIEW');
  console.log(line('─'));
  previewResults.forEach((r, i) => printResult(i + 1, previewList.length, r.municipio, r));

  // Estadísticas
  const okCount  = previewResults.filter(r => !r.error && r.sitios).length;
  const errCount = previewResults.filter(r => r.error).length;
  console.log(`\n${line()}`);
  console.log(`  Preview: ${okCount} con datos · ${previewResults.length - okCount - errCount} sin datos · ${errCount} errores`);

  if (!doApply) {
    console.log(`\n  Para aplicar el UPDATE masivo, ejecuta:`);
    console.log(`  node enriquecerMunicipios.js --apply`);
    console.log(`  node enriquecerMunicipios.js --apply --limite 50\n`);
    await db.end(); return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FASE 2: UPDATE MASIVO
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${line('═')}`);
  console.log(`  UPDATE MASIVO — ${municipios.length} municipios`);
  console.log(line('═'));

  let updatedCount = 0;
  let errorCount   = 0;

  // Guardar resultados del preview primero
  for (const r of previewResults) {
    if (!r.error && (r.sitios || r.hoteles)) {
      await updateMunicipio(r.municipio.id, r.sitios, r.hoteles);
      updatedCount++;
    }
  }

  // Procesar el resto en batches
  const remaining = municipios.slice(PREVIEW_N);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

    console.log(`\n  📦 Batch ${batchNum}/${totalBatches} — municipios ${PREVIEW_N + i + 1} a ${PREVIEW_N + i + batch.length}`);

    // Procesar batch secuencialmente para respetar la API
    for (const m of batch) {
      process.stdout.write(`     ${m.nombre} (${m.departamento})... `);
      const result = await enrichOne(m);

      if (result.error) {
        console.log(`❌ ${result.error}`);
        errorCount++;
      } else if (result.sitios || result.hoteles) {
        await updateMunicipio(m.id, result.sitios, result.hoteles);
        const n = result.sitios ? result.sitios.split('|').length : 0;
        console.log(`✅ ${n} sitios`);
        updatedCount++;
      } else {
        console.log('⚠️  sin datos');
      }

      await sleep(DELAY_MS);
    }

    // Pausa entre batches
    if (i + BATCH_SIZE < remaining.length) {
      process.stdout.write('  ⏳ pausa entre batches...');
      await sleep(800);
      console.log(' listo\n');
    }
  }

  // Resumen final
  console.log(`\n${line('═')}`);
  console.log('  RESUMEN FINAL');
  console.log(line('═'));
  console.log(`  ✅ Municipios actualizados : ${updatedCount}`);
  console.log(`  ❌ Errores                 : ${errorCount}`);
  console.log(`  📊 Total procesados        : ${municipios.length}`);
  console.log(line('═') + '\n');

  await db.end();
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
