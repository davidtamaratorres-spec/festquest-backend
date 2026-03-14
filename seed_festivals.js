const db = require('./db');
const fs = require('fs');

(async () => {
  try {
    console.log("🛠️ Operación Maestra: Recuperando 31 y forzando el 32...");
    
    // Asegurar extensiones de búsqueda inteligente
    await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await db.query('TRUNCATE TABLE festivals RESTART IDENTITY CASCADE');

    const data = fs.readFileSync('data/FestQuest_Database_Final_V3.csv', 'utf8');
    const lines = data.split(/\r?\n/).slice(1).filter(l => l.trim() !== '');
    
    let cargados = 0;

    for (const line of lines) {
      const p = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/"/g, '').trim());
      if (p.length < 5) continue; 

      let [idDane, depto, mun, subregion, hab, alt, fest, fechaTexto, s1, m1, s2, m2, s3, m3] = p;

      // --- ESTRATEGIA DE BÚSQUEDA MULTI-NIVEL ---
      // Nivel 1: Match exacto o por similitud (Lo que nos dio 31/32)
      // Nivel 2: Si es Cúcuta, buscar por texto parcial
      let res = await db.query(
        `SELECT id FROM municipalities 
         WHERE TRIM(LOWER(nombre)) = TRIM(LOWER($1))
         OR nombre % $1
         OR $1 ILIKE '%' || nombre || '%'
         ORDER BY similarity(nombre, $1) DESC LIMIT 1`, 
        [mun]
      );

      // Nivel 3: Si falló y es Cúcuta, forzamos búsqueda por fragmento
      if (res.rows.length === 0 && mun.toLowerCase().includes('cucu')) {
        res = await db.query(`SELECT id FROM municipalities WHERE nombre ILIKE '%Cucu%' LIMIT 1`);
      }

      if (res.rows.length > 0) {
        const munId = res.rows[0].id;
        const fechaSegura = '2026-01-01'; 

        await db.query(`
          INSERT INTO festivals (
            municipio_id, nombre, departamento, fecha_inicio, fecha_fin, habitantes, altura,
            sitio_1, maps_1, sitio_2, maps_2, sitio_3, maps_3, codigo_dane, subregion, descripcion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, 
          [munId, fest, depto, fechaSegura, fechaSegura, hab, alt, s1, m1, s2, m2, s3, m3, idDane, subregion, `Original: ${fechaTexto}`]
        );
        cargados++;
      } else {
        console.log(`❌ No se encontró: "${mun}"`);
      }
    }

    console.log(`\n🏆 RESULTADO FINAL: ${cargados} de 32 festivales.`);
    if (cargados === 32) console.log("✨ ¡PERFECCIÓN ALCANZADA! LOS 32 ESTÁN ADENTRO. ✨");
    process.exit(0);
  } catch (e) {
    console.error('❌ ERROR:', e.message);
    process.exit(1);
  }
})();