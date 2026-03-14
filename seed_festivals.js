const fs = require('fs');
const csv = require('csv-parser');
const db = require('./db');
const path = require('path');

async function seed() {
  const festivals = [];
  // Construimos la ruta dinámica para que no haya pierde
  const filePath = path.join(__dirname, 'data', 'datos_nacionales.csv');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: No encuentro el archivo en ${filePath}`);
    process.exit(1);
  }

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => festivals.push(row))
    .on('end', async () => {
      console.log(`🚀 Leídos ${festivals.length} registros. Iniciando carga...`);
      
      for (const f of festivals) {
        try {
          // 1. Manejo de Municipio (Usamos nombres comunes de columnas de CSV)
          const nombreMuni = f.municipio || f.Municipio || f.MUNICIPIO;
          const nombreDepto = f.departamento || f.Departamento || 'Colombia';
          const nombreFest = f.nombre || f.festival || f.Festival || 'Sin nombre';

          let resMuni = await db.query(
            'SELECT id FROM municipalities WHERE nombre = $1', 
            [nombreMuni]
          );

          let municipalityId;
          if (resMuni.rows.length === 0) {
            const newMuni = await db.query(
              'INSERT INTO municipalities (nombre, departamento) VALUES ($1, $2) RETURNING id',
              [nombreMuni, nombreDepto]
            );
            municipalityId = newMuni.rows[0].id;
            console.log(`📍 Registrado: ${nombreMuni}`);
          } else {
            municipalityId = resMuni.rows[0].id;
          }

          // 2. Insertar en festivals (Asegúrate de que estas columnas existan en tu tabla)
          await db.query(
            `INSERT INTO festivals 
            (nombre, fecha, descripcion, municipio_id, lugar_encuentro, habitantes, altura, maps_link, whatsapp_link) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              nombreFest, 
              f.fecha || 'Por definir', 
              f.descripcion || '', 
              municipalityId, 
              f.lugar_encuentro || '', 
              f.habitantes || 0, 
              f.altura || 0, 
              f.maps_link || '', 
              f.whatsapp_link || ''
            ]
          );
        } catch (err) {
          console.error(`❌ Error en registro:`, err.message);
        }
      }
      console.log('✅ ¡PROCESO TERMINADO CON ÉXITO!');
      process.exit(0);
    });
}

seed();