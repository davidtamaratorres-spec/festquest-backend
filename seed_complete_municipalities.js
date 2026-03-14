const db = require('./db');

(async () => {
  try {
    console.log("🧹 Limpiando tablas y cargando municipios oficiales...");
    
    // Reiniciar tablas
    await db.query('TRUNCATE TABLE festivals RESTART IDENTITY CASCADE');
    await db.query('TRUNCATE TABLE municipalities RESTART IDENTITY CASCADE');

    const municipios = [
      'Medellín', 'Barranquilla', 'Bogotá', 'Cartagena', 'Tunja', 'Manizales', 
      'Florencia', 'Popayán', 'Valledupar', 'Montería', 'Quibdó', 'Neiva', 
      'Riohacha', 'Santa Marta', 'Villavicencio', 'Pasto', 'Cúcuta', 'Armenia', 
      'Pereira', 'Bucaramanga', 'Sincelejo', 'Ibagué', 'Cali', 'Arauca', 
      'Yopal', 'Mocoa', 'San Andrés', 'Leticia', 'Inírida', 
      'San José del Guaviare', 'Mitú', 'Puerto Carreño'
    ];

    for (const nombre of municipios) {
      await db.query('INSERT INTO municipalities (nombre) VALUES ($1)', [nombre]);
    }

    console.log("✅ ¡Municipios cargados exitosamente!");
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();