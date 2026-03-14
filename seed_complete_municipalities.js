const db = require('./db');

(async () => {
  try {
    console.log("🧹 Limpiando base de datos...");
    await db.query('TRUNCATE TABLE festivals, municipalities RESTART IDENTITY CASCADE');

    const municipiosBase = [
      ['Amazonas', 'Leticia'], ['Antioquia', 'Medellín'], ['Arauca', 'Arauca'],
      ['Atlántico', 'Barranquilla'], ['Bolívar', 'Cartagena'], ['Boyacá', 'Tunja'],
      ['Caldas', 'Manizales'], ['Caquetá', 'Florencia'], ['Casanare', 'Yopal'],
      ['Cauca', 'Popayán'], ['Cesar', 'Valledupar'], ['Chocó', 'Quibdó'],
      ['Córdoba', 'Montería'], ['Cundinamarca', 'Bogotá'], ['Guainía', 'Inírida'],
      ['Guaviare', 'San José del Guaviare'], ['Huila', 'Neiva'], ['La Guajira', 'Riohacha'],
      ['Magdalena', 'Santa Marta'], ['Meta', 'Villavicencio'], ['Nariño', 'Pasto'],
      ['Norte de Santander', 'Cúcuta'], ['Putumayo', 'Mocoa'], ['Quindío', 'Armenia'],
      ['Risaralda', 'Pereira'], ['San Andrés', 'San Andrés'], ['Santander', 'Bucaramanga'],
      ['Sucre', 'Sincelejo'], ['Tolima', 'Ibagué'], ['Valle del Cauca', 'Cali'],
      ['Vaupés', 'Mitú'], ['Vichada', 'Puerto Carreño']
    ];

    console.log("🚀 Cargando capitales...");
    for (const [depto, muni] of municipiosBase) {
      await db.query('INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2)', [muni, depto]);
    }

    console.log("✅ Cimientos listos.");
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();