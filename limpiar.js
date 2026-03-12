const db = require('./db');

(async () => {
  try {
    console.log("🧼 Iniciando limpieza de duplicados exactos...");
    
    // Este comando borra los registros que tengan mismo nombre, municipio y departamento
    // dejando solo el que tenga el ID más bajito.
    await db.query(`
      DELETE FROM festivals a USING festivals b
      WHERE a.id > b.id
      AND a.nombre = b.nombre
      AND a.municipio_id = b.municipio_id
      AND a.departamento = b.departamento
    `);

    const res = await db.query('SELECT COUNT(*) FROM festivals');
    console.log(`✨ Limpieza terminada. Quedaron ${res.rows[0].count} festivales únicos.`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error limpiando:', e.message);
    process.exit(1);
  }
})();