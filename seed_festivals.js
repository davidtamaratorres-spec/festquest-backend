const db = require('./db');
const fs = require('fs');

(async () => {
  try {
    // 1. CREAR LA COLUMNA SI NO EXISTE (Esto arregla el error de tu captura 124)
    console.log("🛠️ Asegurando que la columna 'departamento' exista...");
    await db.query('ALTER TABLE festivals ADD COLUMN IF NOT EXISTS departamento VARCHAR(255)');

    // 2. LIMPIEZA: Borramos lo que haya para empezar de cero
    console.log("🧹 Limpiando datos antiguos...");
    await db.query('TRUNCATE TABLE festivals RESTART IDENTITY CASCADE');

    // 3. LEER EL ARCHIVO
    const data = fs.readFileSync('data/festivales.xlsx - festivales_raw.csv', 'utf8');
    const lines = data.split(/\r?\n/).slice(1).filter(l => l.trim() !== '');
    
    console.log(`🚀 Cargando ${lines.length} festivales...`);
    let cargados = 0;

    for (const line of lines) {
      const p = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (p.length < 4) continue;

      const munNombre = p[0].replace(/"/g, '').trim(); 
      const deptoNombre = p[1].replace(/"/g, '').trim(); 
      const festNombre = p[2].replace(/"/g, '').trim(); 
      const fechaTexto = p[3].replace(/"/g, '').trim(); 

      const res = await db.query(
        'SELECT id FROM municipalities WHERE LOWER(nombre) = LOWER($1) LIMIT 1', 
        [munNombre]
      );

      if (res.rows.length > 0) {
        await db.query(
          `INSERT INTO festivals (municipio_id, nombre, departamento, fecha_inicio, fecha_fin, descripcion) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [res.rows[0].id, festNombre, deptoNombre, '2026-01-01', '2026-01-01', `Fecha: ${fechaTexto}`]
        );
        cargados++;
      }
    }

    console.log(`\n🎉 ¡LISTO! ${cargados} festivales cargados con éxito.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ ERROR:', e.message);
    process.exit(1);
  }
})();