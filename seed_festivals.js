const db = require('./db');
const fs = require('fs');

(async () => {
  try {
    const data = fs.readFileSync('data/festivales.xlsx - festivales_raw.csv', 'utf8');
    const lines = data.split(/\r?\n/).slice(1).filter(l => l.trim() !== '');
    
    console.log(`🚀 Iniciando carga de ${lines.length} filas con formato de texto...`);
    let cargados = 0;

    for (const line of lines) {
      // Usamos una lógica más robusta para separar por comas
      const p = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!p || p.length < 4) continue;

      const munNombre = p[0].replace(/"/g, '').trim();
      const festNombre = p[2].replace(/"/g, '').trim();
      const fechaTexto = p[3].replace(/"/g, '').trim(); // La columna D de tu Screenshot_68

      const res = await db.query(
        'SELECT id FROM municipalities WHERE LOWER(nombre) = LOWER($1) LIMIT 1', 
        [munNombre]
      );

      if (res.rows.length > 0) {
        // Ponemos una fecha técnica para saltar la restricción, 
        // pero guardamos tu texto original en 'fecha_inicio' si es texto o en un campo de descripción
        const fechaTecnica = '2026-01-01'; 
        
        await db.query(
          `INSERT INTO festivals (municipio_id, nombre, fecha_inicio, fecha_fin, descripcion) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT DO NOTHING`,
          [res.rows[0].id, festNombre, fechaTecnica, fechaTecnica, `Fecha original: ${fechaTexto}`]
        );
        
        cargados++;
        if (cargados % 20 === 0) console.log(`✅ ${cargados} festivales guardados...`);
      }
    }

    console.log(`\n🎉 ¡TERMINADO! Se cargaron ${cargados} festivales con éxito.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error crítico:', e.message);
    process.exit(1);
  }
})();