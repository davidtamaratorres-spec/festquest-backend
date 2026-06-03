// scripts/generarTokensEdicion.js
// Genera tokens únicos para cada municipio y exporta CSV con links
// Uso: node scripts/generarTokensEdicion.js

require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BASE_URL = process.env.BASE_URL || 'https://www.festquest.app';

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FestQuest — Generador de tokens de edición');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Agregar columnas si no existen
  console.log('📋 Verificando columnas en BD...');
  await pool.query(`
    ALTER TABLE municipalities 
    ADD COLUMN IF NOT EXISTS token_edicion VARCHAR(64),
    ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP,
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(50)
  `).catch(e => console.log('  (columnas ya existen)'));
  console.log('  ✅ Columnas OK\n');

  // 2. Obtener municipios con festivales sin token
  const { rows: sinToken } = await pool.query(`
    SELECT DISTINCT m.id, m.nombre, m.departamento, m.correo_alcalde, m.token_edicion
    FROM municipalities m
    JOIN festivals f ON f.municipio_id = m.id
    ORDER BY m.nombre
  `);

  console.log(`🔍 ${sinToken.length} municipios con festivales encontrados\n`);

  // 3. Generar tokens para los que no tienen
  let generados = 0;
  for (const m of sinToken) {
    if (!m.token_edicion) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'UPDATE municipalities SET token_edicion = $1 WHERE id = $2',
        [token, m.id]
      );
      m.token_edicion = token;
      generados++;
    }
  }
  console.log(`🔑 ${generados} tokens nuevos generados\n`);

  // 4. Exportar CSV
  const outputDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const csvPath = path.join(outputDir, 'links_edicion.csv');
  const lines = ['Municipio,Departamento,Correo Alcalde,Link de Edición,Estado'];

  const { rows: todos } = await pool.query(`
    SELECT DISTINCT 
      m.id, m.nombre, m.departamento, m.correo_alcalde, m.token_edicion,
      m.alcalde, m.sitios_turisticos, m.fecha_actualizacion
    FROM municipalities m
    JOIN festivals f ON f.municipio_id = m.id
    WHERE m.token_edicion IS NOT NULL
    ORDER BY m.departamento, m.nombre
  `);

  for (const m of todos) {
    const link = `${BASE_URL}/municipio/${slugify(m.nombre)}/editar?token=${m.token_edicion}`;
    const correo = m.correo_alcalde || '';
    const estado = m.fecha_actualizacion ? 'Completado' : (m.sitios_turisticos ? 'Parcial' : 'Pendiente');
    lines.push(`"${m.nombre}","${m.departamento}","${correo}","${link}","${estado}"`);
  }

  fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');

  console.log(`📄 CSV generado: data/links_edicion.csv`);
  console.log(`   ${todos.length} municipios exportados\n`);

  // 5. Mostrar preview
  console.log('─────────────────────────────────────────────────────');
  console.log('  PREVIEW — primeros 5 links');
  console.log('─────────────────────────────────────────────────────');
  todos.slice(0, 5).forEach(m => {
    const link = `${BASE_URL}/municipio/${slugify(m.nombre)}/editar?token=${m.token_edicion}`;
    console.log(`\n  ${m.nombre} (${m.departamento})`);
    console.log(`  ${link}`);
    if (m.correo_alcalde) console.log(`  📧 ${m.correo_alcalde}`);
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Listo. Envía los links a cada municipio.');
  console.log('═══════════════════════════════════════════════════════\n');

  await pool.end();
}

main().catch(err => { console.error('Error:', err); process.exit(1); });