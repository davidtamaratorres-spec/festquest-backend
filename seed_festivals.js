const fs = require('fs');
const csv = require('csv-parser');
const db = require('./db');

async function seed() {
  const festivals = [];
  // Asegúrate de que el nombre del archivo sea exacto
  fs.createReadStream('./FestQuest_Database_Final_V3.csv') 
    .pipe(csv())
    .on('data', (row) => festivals.push(row))
    .on('end', async () => {
      console.log('🚀 Cargando datos a nivel nacional...');
      
      for (const f of festivals) {
        try {
          // Buscamos si el municipio ya existe
          let resMuni = await db.query(
            'SELECT id FROM municipalities WHERE nombre = $1', 
            [f.municipio]
          );

          let municipalityId;
          if (resMuni.rows.length === 0) {
            // SI NO EXISTE, LO CREAMOS con el departamento del CSV
            // Usamos f.departamento. Si está vacío en el CSV, le pone 'Colombia'
            const depto = f.departamento || 'Colombia';
            const newMuni = await db.query(
              'INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2) RETURNING id',
              [f.municipio, depto]
            );
            municipalityId = newMuni.rows[0].id;
            console.log(`📍 Nuevo municipio creado: ${f.municipio} (${depto})`);
          } else {
            municipalityId = resMuni.rows[0].id;
          }

          // Insertar el festival
          await db.query(
            `INSERT INTO festivals 
            (nombre, fecha, descripcion, municipio_id, lugar_encuentro, habitantes, altura, maps_link, whatsapp_link) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              f.nombre, f.fecha, f.descripcion, municipalityId, 
              f.lugar_encuentro, f.habitantes, f.altura, f.maps_link, f.whatsapp_link
            ]
          );
        } catch (err) {
          console.error(`❌ Error en festival ${f.nombre}:`, err.message);
        }
      }
      console.log('✅ ¡Proceso terminado! Todos los municipios y festivales cargados.');
      process.exit(0);
    });
}

seed();