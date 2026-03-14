const db = require('./db');

(async () => {
  try {
    console.log("🧹 Limpiando base de datos para carga NACIONAL...");
    await db.query('TRUNCATE TABLE festivals, municipalities RESTART IDENTITY CASCADE');

    // Aquí empezamos con una lista de ejemplo basada en tu PDF
    // Pero la clave es que el SIGUIENTE script cargará el resto desde tu CSV
    const municipiosBase = [
      ['Antioquia', 'Medellín'], ['Antioquia', 'Abejorral'], ['Antioquia', 'Abriaquí'],
      ['Casanare', 'Yopal'], ['Casanare', 'Támara'], ['Casanare', 'Tauramena'],
      ['Putumayo', 'Mocoa'], ['Putumayo', 'Puerto Asís'], ['Putumayo', 'Sibundoy'],
      ['Amazonas', 'Leticia'], ['Amazonas', 'Puerto Nariño']
      // ... se agregan las 32 capitales que ya tienes en el código anterior
    ];

    console.log("🚀 Cargando municipios del DANE...");
    for (const [depto, muni] of municipiosBase) {
      await db.query('INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2)', [muni, depto]);
    }

    console.log("✅ Cimientos nacionales listos. Ahora vamos por el resto.");
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();