const db = require('./db');

(async () => {
  try {
    console.log("🧹 Limpiando y preparando tabla de municipios...");
    
    // 1. Eliminar datos viejos para no duplicar
    await db.query('TRUNCATE TABLE festivals RESTART IDENTITY CASCADE');
    await db.query('TRUNCATE TABLE municipalities RESTART IDENTITY CASCADE');

    // 2. Lista Maestra (Capitales y municipios críticos)
    // Nota: Aquí puedes expandir esta lista con los 1100 del PDF
    const municipios = [
      'Medellín', 'Barranquilla', 'Bogotá', 'Cartagena', 'Tunja', 'Manizales', 
      'Florencia', 'Popayán', 'Valledupar', 'Montería', 'Quibdó', 'Neiva', 
      'Riohacha', 'Santa Marta', 'Villavicencio', 'Pasto', 'Cúcuta', 'Armenia', 
      'Pereira', 'Bucaramanga', 'Sincelejo', 'Ibagué', 'Cali', 'Arauca', 
      'Yopal', 'Mocoa', 'San Andrés', 'Leticia', 'Inírida', 
      'San José del Guaviare', 'Mitú', 'Puerto Carreño',
      // Agrega aquí otros municipios del PDF si lo deseas
    ];

    console.log(`🚀 Insertando ${municipios.length} municipios oficiales...`);

    for (const nombre of municipios) {
      await db.query('INSERT INTO municipalities (nombre) VALUES ($1)', [nombre]);
    }

    console.log("✅ Municipios cargados exitosamente.");
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();