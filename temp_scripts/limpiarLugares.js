/**
 * limpiarLugares.js
 *
 * Detecta y corrige valores incorrectos en festivals.lugar_encuentro:
 * valores que no son colombianos (Wikipedia devolvió artículo incorrecto
 * para nombres genéricos como "Fiestas de San Antonio").
 *
 * Estrategia:
 *  1. Busca lugares que NO contienen ningún departamento o municipio colombiano
 *     Y que parecen ser ciudades/países extranjeros o valores inválidos.
 *  2. Los reemplaza con el geo-fallback: "municipio, departamento"
 *
 * Uso:
 *   node limpiarLugares.js          → dry-run (muestra sin escribir)
 *   node limpiarLugares.js --apply  → escribe en BD
 */

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN = !process.argv.includes('--apply');

// Términos que delatan un resultado de Wikipedia incorrecto (no colombiano)
const EXTRANJERO = [
  'amsterdam','ámsterdam','amsterdam',
  'tenerife','canarias','españa','spain',
  'alquife','almería','granada','sevilla','barcelona','madrid, españa',
  'united kingdom','england','uk ',
  'mexico','méxico','perú','argentina','chile','venezuela',
  'estados unidos','united states',
  'brasil','portugal','france','italia',
  'nueva york','new york','los angeles','chicago',
];

// Departamentos colombianos para detectar si el valor es colombiano
const DEPTOS = [
  'antioquia','atlántico','atlantico','bolívar','bolivar','boyacá','boyaca',
  'caldas','caquetá','caqueta','casanare','cauca','cesar','chocó','choco',
  'córdoba','cordoba','cundinamarca','guainía','guajira','guaviare','huila',
  'magdalena','meta','nariño','narino','norte de santander','putumayo',
  'quindío','quindio','risaralda','san andrés','santander','sucre','tolima',
  'valle del cauca','vaupés','vaupes','vichada','amazonas','arauca','bogotá','bogota',
];

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

async function main() {
  const { rows } = await pool.query(`
    SELECT f.id, f.nombre, f.lugar_encuentro,
           m.nombre AS muni, m.departamento AS depto
    FROM festivals f
    LEFT JOIN municipalities m ON m.id = f.municipio_id
    WHERE f.lugar_encuentro IS NOT NULL AND TRIM(f.lugar_encuentro) <> ''
    ORDER BY f.nombre ASC
  `);

  const incorrectos = [];

  for (const f of rows) {
    const lugar = norm(f.lugar_encuentro);
    const esExtranjero = EXTRANJERO.some(e => lugar.includes(norm(e)));
    const esColombia   = DEPTOS.some(d => lugar.includes(d))
                      || (f.muni  && lugar.includes(norm(f.muni)))
                      || (f.depto && lugar.includes(norm(f.depto)));

    if (esExtranjero || (!esColombia && f.lugar_encuentro.length < 15 && !/,/.test(f.lugar_encuentro))) {
      const fallback = f.depto ? `${f.muni}, ${f.depto}` : (f.muni || '');
      if (fallback) {
        incorrectos.push({ id: f.id, nombre: f.nombre, actual: f.lugar_encuentro, fallback });
      }
    }
  }

  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  limpiarLugares.js${DRY_RUN ? ' — DRY RUN' : ' — APPLY'}`);
  console.log(`${'═'.repeat(72)}`);
  console.log(`  Festivales con lugar_encuentro: ${rows.length}`);
  console.log(`  Con valor incorrecto detectado: ${incorrectos.length}`);

  if (incorrectos.length) {
    console.log(`\n  ${'FESTIVAL'.padEnd(42)} ${'ACTUAL'.padEnd(22)} → NUEVO`);
    console.log('  ' + '─'.repeat(70));
    for (const r of incorrectos) {
      console.log(`  ${pad(r.nombre,42)} ${pad(r.actual,22)} → ${r.fallback}`);
    }
  }

  if (!DRY_RUN && incorrectos.length) {
    let fixed = 0;
    for (const r of incorrectos) {
      await pool.query('UPDATE festivals SET lugar_encuentro = $1 WHERE id = $2', [r.fallback, r.id]);
      fixed++;
    }
    console.log(`\n  ✅ ${fixed} lugares corregidos en BD`);
  } else if (DRY_RUN) {
    console.log('\n  ℹ️  DRY RUN — sin cambios en BD');
  }

  console.log(`${'═'.repeat(72)}\n`);
  await pool.end();
}

main().catch(e => { console.error('❌', e.message); pool.end(); });
