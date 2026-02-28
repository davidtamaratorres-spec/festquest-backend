// bulkSeedFestivals.js
// Ejecutar con: node bulkSeedFestivals.js
// Año base: 2026

const db = require("./db");

const data = [

  // ========================
  // BLOQUE 1
  // ========================

  { municipio: "Necoclí", fiesta: "Fiestas del Coco", inicio: "2026-01-01", fin: "2026-01-07" },

  { municipio: "El Peñol", fiesta: "Fiestas del Viejo Peñol y del Embalse", inicio: "2026-06-12", fin: "2026-06-15" },
  { municipio: "La Pintada", fiesta: "Fiestas del Turismo y la Ganadería", inicio: "2026-06-12", fin: "2026-06-15" },

  { municipio: "San Francisco", fiesta: "Fiestas locales", inicio: "2026-06-26", fin: "2026-06-29" },
  { municipio: "San Luis", fiesta: "Fiestas locales", inicio: "2026-06-26", fin: "2026-06-29" },
  { municipio: "Anzá", fiesta: "Fiestas locales", inicio: "2026-06-26", fin: "2026-06-29" },
  { municipio: "Yarumal", fiesta: "Fiestas locales", inicio: "2026-06-26", fin: "2026-06-29" },

  { municipio: "La Ceja", fiesta: "Fiestas tradicionales", inicio: "2026-08-28", fin: "2026-08-31" },
  { municipio: "San Carlos", fiesta: "Fiestas tradicionales", inicio: "2026-08-28", fin: "2026-08-31" },
  { municipio: "Cisneros", fiesta: "Fiestas tradicionales", inicio: "2026-08-28", fin: "2026-08-31" },
  { municipio: "Ituango", fiesta: "Fiestas tradicionales", inicio: "2026-08-28", fin: "2026-08-31" },

  { municipio: "Andes", fiesta: "Fiestas Katías", inicio: "2026-10-29", fin: "2026-11-02" },
  { municipio: "Santo Domingo", fiesta: "Fiestas del Chalán y la Ganadería", inicio: "2026-10-30", fin: "2026-11-02" },

  { municipio: "Sonsón", fiesta: "Fiestas del Mármol", inicio: "2026-11-13", fin: "2026-11-16" },

  // ========================
  // BLOQUE 2
  // ========================

  { municipio: "Guatapé", fiesta: "Fiestas del Embalse y del Turismo", inicio: "2026-06-26", fin: "2026-06-29" },

  { municipio: "El Santuario", fiesta: "Fiestas del Retorno", inicio: "2026-01-09", fin: "2026-01-11" },
  { municipio: "Marinilla", fiesta: "Fiestas Populares de La Vaca en la Torre", inicio: "2026-01-08", fin: "2026-01-12" },

  { municipio: "San Rafael", fiesta: "Las Fiestas de la Panela", inicio: "2026-07-17", fin: "2026-07-20" },
  { municipio: "Cocorná", fiesta: "Fiestas del Río", inicio: "2026-07-10", fin: "2026-07-13" },
  { municipio: "Sabanalarga", fiesta: "Fiestas del Retorno y de la Cordialidad", inicio: "2026-06-19", fin: "2026-06-22" },
  { municipio: "Olaya", fiesta: "Fiestas y el Reinado del Verano", inicio: "2026-07-24", fin: "2026-07-27" },

  { municipio: "Tarazá", fiesta: "Fiestas del Río Tarazá", inicio: "2026-01-05", fin: "2026-01-07" },

  { municipio: "Yolombó", fiesta: "Fiestas del Marquesado y la Molienda", inicio: "2026-10-09", fin: "2026-10-12" },
  { municipio: "Bolombolo", fiesta: "Fiestas de la Canoa", inicio: "2026-08-07", fin: "2026-08-10" },

];

async function run() {
  console.log("🚀 Iniciando carga masiva Antioquia 2026...\n");

  for (const item of data) {

    // Crear municipio si no existe
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO municipalities (nombre, departamento, descripcion)
         VALUES (?, ?, ?)`,
        [item.municipio, "Antioquia", ""],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Obtener ID del municipio
    const municipio = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM municipalities WHERE nombre = ?`,
        [item.municipio],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Insertar fiesta
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO festivals (municipio_id, nombre, fecha_inicio, fecha_fin, descripcion)
         VALUES (?, ?, ?, ?, ?)`,
        [municipio.id, item.fiesta, item.inicio, item.fin, ""],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log("✔ Insertado:", item.municipio, "-", item.fiesta);
  }

  console.log("\n✅ Carga masiva finalizada correctamente.");
  process.exit();
}

run();
