const fs = require('fs');
const db = require('./db');
const path = require('path');

async function seed() {
  const filePath = path.join(__dirname, 'data', 'datos_nacionales.csv');
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const filas = data.split(/\r?\n/).filter(f => f.trim() !== '');
    
    console.log(`📊 Intentando rescatar ${filas.length} registros...`);
    let guardados = 0;

    for (let i = 1; i < filas.length; i++) {
      // Rompemos por CUALQUIER espacio, sin importar cuántos sean
      const col = filas[i].split(/\s+/).filter(c => c.length > 0);
      
      if (col.length === 0) continue;

      // Si no encuentra municipio, usa el departamento. No dejamos nada vacío.
      const depto = col[0];
      const muni = col[1] || col[0]; 
      const fest = col[2] || `Feria de ${muni}`;

      try {
        const res = await db.query(
          'INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2) ON CONFLICT (nombre) DO UPDATE SET departamento = EXCLUDED.departamento RETURNING id',
          [muni, depto]
        );
        await db.query('INSERT INTO festivals (nombre, municipio_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [fest, res.rows[0].id]);
        
        guardados++;
        // Verás el nombre del municipio en tiempo real
        console.log(`✅ [${guardados}] Guardado: ${muni}`);
      } catch (e) {
        // Si falla uno, que siga con el siguiente
      }
    }
    console.log(`\n🏁 ¡POR FIN! Total cargado: ${guardados}`);
    process.exit(0);
  } catch (err) { console.log("Error:", err.message); }
}
seed();