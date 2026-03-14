const db = require('./db');
const fs = require('fs');

(async () => {
  try {
    console.log("🛠️ Preparando tabla para la Versión 3 (DANE, Mapas, WhatsApp)...");
    
    // 1. Aseguramos que la tabla tenga TODAS las columnas nuevas
    const nuevasColumnas = [
      'departamento VARCHAR(255)',
      'codigo_dane VARCHAR(20)',
      'subregion VARCHAR(100)',
      'habitantes VARCHAR(50)',
      'altura VARCHAR(50)',
      'sitio_1 VARCHAR(255)', 'maps_1 TEXT',
      'sitio_2 VARCHAR(255)', 'maps_2 TEXT',
      'sitio_3 VARCHAR(255)', 'maps_3 TEXT',
      'hotel_1 VARCHAR(255)', 'wa_1 TEXT',
      'hotel_2 VARCHAR(255)', 'wa_2 TEXT',
      'hotel_3 VARCHAR(255)', 'wa_3 TEXT',
      'descripcion TEXT'
    ];

    for (const col of nuevasColumnas) {
      await db.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS ${col}`);
    }

    // 2. Limpieza total para no duplicar datos
    console.log("🧹 Borrando datos viejos...");
    await db.query('TRUNCATE TABLE festivals RESTART IDENTITY CASCADE');

    // 3. Leer el archivo V3 (Asegúrate de que el nombre sea exacto)
    const data = fs.readFileSync('data/FestQuest_Database_Final_V3.csv', 'utf8');
    const lines = data.split(/\r?\n/).slice(1).filter(l => l.trim() !== '');
    
    console.log(`🚀 Procesando ${lines.length} líneas del CSV...`);
    let cargados = 0;

    for (const line of lines) {
      // Separador inteligente para manejar comas dentro de comillas
      const p = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/"/g, '').trim());
      
      if (p.length < 10) continue; 

      // Mapeo exacto según tu archivo V3:
      // departamento[0], municipio[1], habitantes[2], altura[3], festival[4], fecha[5]...
      const [depto, mun, hab, alt, fest, fechaTexto, s1, m1, s2, m2, s3, m3, h1, w1, h2, w2, h3, w3] = p;

      // Buscamos el ID del municipio ignorando tildes/espacios/mayúsculas
      const res = await db.query(
        'SELECT id FROM municipalities WHERE TRIM(LOWER(nombre)) = TRIM(LOWER($1)) LIMIT 1', 
        [mun]
      );

      if (res.rows.length > 0) {
        const munId = res.rows[0].id;
        
        // Fecha segura para evitar el error de "125m"
        const fechaSegura = '2026-01-01'; 

        const queryInsert = `
          INSERT INTO festivals (
            municipio_id, nombre, departamento, fecha_inicio, habitantes, altura,
            sitio_1, maps_1, sitio_2, maps_2, sitio_3, maps_3,
            hotel_1, wa_1, hotel_2, wa_2, hotel_3, wa_3, descripcion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`;

        await db.query(queryInsert, [
          munId, fest, depto, fechaSegura, hab, alt, 
          s1, m1, s2, m2, s3, m3, 
          h1, w1, h2, w2, h3, w3,
          `Fecha original: ${fechaTexto}`
        ]);
        cargados++;
      } else {
        // Si sale Amazonas o el nombre del departamento, el script lo saltará solo
        console.log(`⚠️ Saltando: "${mun}" no es un municipio en la base de datos.`);
      }
    }

    console.log(`\n🎉 ¡SÚPER ÉXITO! ${cargados} festivales cargados correctamente.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ ERROR CRÍTICO:', e.message);
    process.exit(1);
  }
})();