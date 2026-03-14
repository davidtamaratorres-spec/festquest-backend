const fs = require('fs');
const csv = require('csv-parser');
const db = require('./db');

async function seed() {
  const festivals = [];
  // Asegúrate de que el nombre del archivo coincida con el tuyo
  fs.createReadStream('./FestQuest_Database_Final_V3.csv') 
    .pipe(csv())
    .on('data', (row) => festivals.push(row))
    .on('end', async () => {
      console.log('🚀 Iniciando carga inteligente...');
      
      for (const f of festivals) {
        try {
          // 1. Verificar o crear el municipio dinámicamente
          let resMuni = await db.query(
            'SELECT id FROM municipalities WHERE nombre = $1', 
            [f.municipio]
          );

          let municipalityId;
          if (resMuni.rows.length === 0) {
            // Si no existe, lo insertamos. 
            // Usamos el departamento del CSV o 'Por definir' si no viene
            const newMuni = await db.query(
              'INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2) RETURNING id',
              [f.municipio, f.departamento || 'Colombia']
            );
            municipalityId = newMuni.rows[0].id;
            console.log(`📍 Municipio creado: ${f.municipio}`);
          } else {
            municipalityId = resMuni.rows[0].id;
          }

          // 2. Insertar el festival vinculado al ID del municipio
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
      console.log('✅ ¡Proceso terminado!');
      process.exit(0);
    });
}

seed();