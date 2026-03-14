const fs = require('fs');
const csv = require('csv-parser');
const db = require('./db');

async function seed() {
  const festivals = [];
  // Usamos el nombre nuevo para forzar a Git a subirlo
  fs.createReadStream('./datos_nacionales.csv') 
    .pipe(csv())
    .on('data', (row) => festivals.push(row))
    .on('end', async () => {
      console.log('🚀 Cargando festivales y municipios restantes...');
      
      for (const f of festivals) {
        try {
          let resMuni = await db.query(
            'SELECT id FROM municipalities WHERE nombre = $1', 
            [f.municipio]
          );

          let municipalityId;
          if (resMuni.rows.length === 0) {
            const depto = f.departamento || 'Colombia';
            const newMuni = await db.query(
              'INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2) RETURNING id',
              [f.municipio, depto]
            );
            municipalityId = newMuni.rows[0].id;
            console.log(`📍 Nuevo municipio: ${f.municipio}`);
          } else {
            municipalityId = resMuni.rows[0].id;
          }

          await db.query(
            `INSERT INTO festivals 
            (nombre, fecha, descripcion, municipio_id, lugar_encuentro, habitantes, altura, maps_link, whatsapp_link) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [f.nombre, f.fecha, f.descripcion, municipalityId, f.lugar_encuentro, f.habitantes, f.altura, f.maps_link, f.whatsapp_link]
          );
        } catch (err) {
          console.error(`❌ Error en: ${f.nombre}`, err.message);
        }
      }
      console.log('✅ Carga nacional completa.');
      process.exit(0);
    });
}
seed();