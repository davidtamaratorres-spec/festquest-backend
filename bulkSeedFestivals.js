const fs = require('fs');
const csv = require('csv-parser');
const db = require("./db");

// Función para normalizar nombres (quita tildes y espacios)
const clean = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";

async function seed() {
    console.log("🚀 Iniciando carga inteligente...");
    const fileMun = 'data/municipios.xlsx - municipios.csv';
    const fileFest = 'data/festivales.xlsx - festivales_raw.csv';

    // 1. CARGAR MUNICIPIOS
    const municipios = [];
    fs.createReadStream(fileMun).pipe(csv()).on('data', (row) => municipios.push(row)).on('end', async () => {
        for (const m of municipios) {
            try {
                await db.query(
                    `INSERT INTO municipalities (nombre, departamento, subregion, habitantes) 
                     VALUES ($1, $2, $3, $4) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre`,
                    [m.nombre.trim(), m.departamento, m.subregion, m.habitantes]
                );
            } catch (e) { console.log("Error municipio:", m.nombre); }
        }
        console.log("✅ Municipios sincronizados.");

        // 2. CARGAR FESTIVALES
        const festivales = [];
        fs.createReadStream(fileFest).pipe(csv()).on('data', (row) => festivales.push(row)).on('end', async () => {
            const allMun = await db.query("SELECT id, nombre FROM municipalities");
            
            for (const f of festivales) {
                // Buscamos el municipio ignorando mayúsculas y tildes
                const found = allMun.rows.find(m => clean(m.nombre) === clean(f.municipio));
                if (found) {
                    try {
                        await db.query(
                            "INSERT INTO festivals (municipio_id, nombre, fecha_inicio_texto) VALUES ($1, $2, $3)",
                            [found.id, f.festival_nombre, f.fecha_text]
                        );
                        console.log(`✔ Cargado: ${f.festival_nombre} en ${found.nombre}`);
                    } catch (e) { /* Ya existe o error menor */ }
                } else {
                    console.log(`❌ No encontré el municipio para: ${f.festival_nombre} (${f.municipio})`);
                }
            }
            console.log("⭐ ¡PROCESO TERMINADO!");
            process.exit();
        });
    });
}
seed();