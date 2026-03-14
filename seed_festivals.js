const db = require('./db');
const fs = require('fs');

(async () => {
  try {
    console.log("🛠️ Iniciando carga final de los 32 festivales (Versión Match Total)...");
    
    // 1. Asegurar columnas
    const nuevasColumnas = [
      'departamento VARCHAR(255)', 'codigo_dane VARCHAR(20)', 'subregion VARCHAR(100)',
      'habitantes VARCHAR(50)', 'altura VARCHAR(50)', 'sitio_1 VARCHAR(255)', 
      'maps_1 TEXT', 'sitio_2 VARCHAR(255)', 'maps_2 TEXT', 'sitio_3 VARCHAR(255)', 
      'maps_3 TEXT', 'hotel_1 VARCHAR(255)', 'wa_1 TEXT', 'hotel_2 VARCHAR(255)', 
      'wa_2 TEXT', 'hotel_3 VARCHAR(255)', 'wa_3 TEXT', 'descripcion TEXT'
    ];

    for (const col of nuevasColumnas) {
      await db.query(`ALTER TABLE festivals ADD COLUMN IF NOT EXISTS ${col}`);
    }

    await db.query('TRUNCATE TABLE festivals RESTART IDENTITY CASCADE');

    // 2. Leer CSV
    const data = fs.readFileSync('data/FestQuest_Database_Final_V3.csv', 'utf8');
    const lines = data.split(/\r?\n/).slice(1).filter(l => l.trim() !== '');
    
    console.log(`🚀 Procesando ${lines.length} registros...`);
    let cargados = 0;

    for (const line of lines) {
      const p = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/"/g, '').trim());
      if (p.length < 5) continue; 

      let [idDane, depto, mun, subregion, hab, alt, fest, fechaTexto, s1, m1, s2, m2, s3, m3] = p;

      // MAPA DE CORRECCIÓN PARA LOS 5 QUE FALTAN (Basado en Screenshot 47)
      const correcciones = {
        'Cucuta': 'Cúcuta',
        'Cúcuta': 'Cucuta',
        'Inirida': 'Inírida',
        'Inírida': 'Inirida',
        'Florencia': 'Florencia',
        'San Jose del Guaviare': 'San José del Guaviare',
        'San José del Guaviare': 'San Jose del Guaviare',
        'Puerto Carreno': 'Puerto Carreño',
        'Puerto Carreño': 'Puerto Carreno'
      };

      const nombreBuscar = correcciones[mun] || mun;

      // Búsqueda en la tabla municipalities
      const res = await db.query(
        `SELECT id FROM municipalities 
         WHERE TRIM(LOWER(nombre)) = TRIM(LOWER($1)) 
         OR TRIM(LOWER(nombre)) = TRIM(LOWER($2)) 
         LIMIT 1`, 
        [mun, nombreBuscar]
      );

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
        console.log(`⚠️ Falló match final: "${mun}"`);
      }
    }

    console.log(`\n🎉 ¡MISIÓN CUMPLIDA! ${cargados} festivales cargados con éxito.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ ERROR:', e.message);
    process.exit(1);
  }
})();