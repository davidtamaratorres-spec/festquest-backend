/**
 * generarPromptsFoto.js
 *
 * Genera prompts creativos en inglés para Adobe Firefly
 * por cada festival, usando Claude Haiku 4.5.
 *
 * El prompt describe la escena visual del festival:
 * colores, ambiente, tradición, localización colombiana.
 *
 * Uso:
 *   node generarPromptsFoto.js               → dry-run (primeros 10)
 *   node generarPromptsFoto.js --apply       → todos los festivales
 *   node generarPromptsFoto.js --id 42       → solo ese festival
 *   node generarPromptsFoto.js --force       → sobrescribe existentes
 *   node generarPromptsFoto.js --limite 50   → máximo N festivales
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { Pool }  = require('pg');

const pool     = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const claude   = new Anthropic();
const DRY_RUN  = !process.argv.includes('--apply');
const FORCE    = process.argv.includes('--force');
const ONLY_ID  = (() => { const i = process.argv.indexOf('--id');     return i !== -1 ? parseInt(process.argv[i+1], 10) : null; })();
const LIMITE   = (() => { const i = process.argv.indexOf('--limite'); return i !== -1 ? parseInt(process.argv[i+1], 10) : DRY_RUN ? 10 : 9999; })();

const MODEL  = 'claude-haiku-4-5';
const DELAY  = 120; // ms entre llamadas (Haiku es rápido)
const sleep  = ms => new Promise(r => setTimeout(r, ms));

// ── Truncar descripción para el contexto ──────────────────────────────────
function extractDesc(desc, maxChars = 280) {
  if (!desc) return '';
  const clean = desc.replace(/\s+/g, ' ').trim();
  return clean.length > maxChars ? clean.slice(0, maxChars) + '…' : clean;
}

// ── Generar prompt con Claude ──────────────────────────────────────────────
async function generatePrompt(festival) {
  const { nombre, municipio, departamento, subregion, descripcion } = festival;
  const region = subregion || departamento || 'Colombia';
  const desc   = extractDesc(descripcion);

  const userMsg = `Generate a vivid Adobe Firefly image prompt for this Colombian festival:

Festival: ${nombre}
Location: ${municipio}, ${region}
${desc ? `Context: ${desc}` : ''}

Requirements:
- 60–100 words, English
- Describe the visual scene: costumes, music, crowd, setting, light
- Include: "Colombian cultural festival", the specific region or tradition
- End with: "photorealistic, cinematic lighting, vibrant colors, award-winning photography"
- NO hashtags, NO quotes around the prompt, just the prompt text`;

  const msg = await claude.messages.create({
    model:      MODEL,
    max_tokens: 180,
    system:     'You are a visual prompt engineer. Output ONLY the prompt text — no titles, headers, labels, hashtags, or markdown formatting.',
    messages:   [{ role: 'user', content: userMsg }],
  });

  const raw = (msg.content[0]?.type === 'text' ? msg.content[0].text : '').trim();
  // Eliminar encabezados markdown, comillas y líneas vacías iniciales
  return raw
    .replace(/^#+\s+[^\n]*\n*/gm, '')   // # Título ...
    .replace(/^\s*["'`]|["'`]\s*$/g, '') // comillas envolventes
    .replace(/^\s+/, '')
    .trim();
}

// ── Obtener festivales ────────────────────────────────────────────────────
async function getFestivales() {
  if (ONLY_ID) {
    const { rows } = await pool.query(
      `SELECT f.id, f.nombre, f.descripcion, f.foto_prompt,
              m.nombre AS municipio, m.departamento, m.subregion
       FROM festivals f
       LEFT JOIN municipalities m ON m.id = f.municipio_id
       WHERE f.id = $1`, [ONLY_ID]
    );
    return rows;
  }

  const skipExisting = FORCE ? '' : 'AND (f.foto_prompt IS NULL OR TRIM(f.foto_prompt) = \'\')';

  const { rows } = await pool.query(`
    SELECT f.id, f.nombre, f.descripcion, f.foto_prompt,
           m.nombre AS municipio, m.departamento, m.subregion
    FROM festivals f
    LEFT JOIN municipalities m ON m.id = f.municipio_id
    WHERE f.descripcion IS NOT NULL ${skipExisting}
    ORDER BY f.nombre ASC
    LIMIT $1
  `, [LIMITE]);
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY no configurada');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  FestQuest — generarPromptsFoto.js  [${MODEL}]`);
  console.log(`  ${DRY_RUN ? 'DRY RUN (primeros 10)' : 'MODO APPLY'}${FORCE ? ' + FORCE' : ''}`);
  console.log('═'.repeat(70));

  const festivales = await getFestivales();
  console.log(`\n  Festivales a procesar: ${festivales.length}\n`);

  if (!festivales.length) {
    console.log('  ✅ Todos los festivales ya tienen foto_prompt. Usa --force para regenerar.');
    await pool.end(); return;
  }

  let ok = 0, errores = 0;
  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);

  for (let i = 0; i < festivales.length; i++) {
    const f = festivales[i];
    process.stdout.write(`  [${String(i+1).padStart(3)}/${festivales.length}] ${pad(f.nombre, 40)} `);

    try {
      const prompt = await generatePrompt(f);

      if (!prompt || prompt.length < 30) {
        console.log('⚠️  prompt vacío');
        errores++;
        continue;
      }

      // Preview truncado
      const preview = prompt.slice(0, 60) + (prompt.length > 60 ? '…' : '');
      console.log(preview);

      if (!DRY_RUN) {
        await pool.query(
          'UPDATE festivals SET foto_prompt = $1 WHERE id = $2',
          [prompt, f.id]
        );
      }

      ok++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      errores++;
    }

    await sleep(DELAY);
  }

  // Resumen
  console.log('\n' + '═'.repeat(70));
  console.log(`  ✅ Prompts generados : ${ok}`);
  if (errores) console.log(`  ❌ Errores          : ${errores}`);
  if (DRY_RUN) console.log('  ℹ️  DRY RUN — sin cambios en BD. Usa --apply para escribir.');
  console.log('═'.repeat(70) + '\n');

  await pool.end();
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); pool.end(); process.exit(1); });
