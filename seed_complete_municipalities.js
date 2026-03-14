const db = require('./db');

(async () => {
  try {
    console.log("🧹 Destruyendo tablas viejas y reconstruyendo desde cero...");
    
    // 1. Destruimos las tablas viejas para evitar conflictos de columnas
    await db.query('DROP TABLE IF EXISTS festivals CASCADE');
    await db.query('DROP TABLE IF EXISTS municipalities CASCADE');

    // 2. Creamos la tabla de municipios
    await db.query(`
      CREATE TABLE municipalities (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        departamento VARCHAR(255)
      )
    `);

    // 3. Creamos la tabla de festivales CON TODAS LAS COLUMNAS NUEVAS
    await db.query(`
      CREATE TABLE festivals (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        fecha VARCHAR(255),
        descripcion TEXT,
        municipio_id INTEGER REFERENCES municipalities(id),
        lugar_encuentro VARCHAR(255),
        habitantes VARCHAR(255),
        altura VARCHAR(255),
        maps_link TEXT,
        whatsapp_link TEXT
      )
    `);

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

    console.log("🚀 Cargando capitales base...");
    for (const [depto, muni] of municipiosBase) {
      await db.query('INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2)', [muni, depto]);
    }

    console.log("✅ Base de datos reconstruida y cimientos listos.");
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();