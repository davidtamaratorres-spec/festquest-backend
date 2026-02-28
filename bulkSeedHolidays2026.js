// bulkSeedHolidays2026.js
// Carga festivos oficiales de Colombia (CO) para 2026 en tabla holidays.
// Corre 1 vez y listo (puedes re-correr: usa INSERT OR IGNORE / ON CONFLICT DO NOTHING)

const db = require("./db");

const HOLIDAYS_2026_CO = [
  { fecha: "2026-01-01", nombre: "Año Nuevo" },
  { fecha: "2026-01-12", nombre: "Reyes Magos (trasladado)" },
  { fecha: "2026-03-23", nombre: "San José (trasladado)" },
  { fecha: "2026-04-02", nombre: "Jueves Santo" },
  { fecha: "2026-04-03", nombre: "Viernes Santo" },
  { fecha: "2026-05-01", nombre: "Día del Trabajo" },
  { fecha: "2026-05-18", nombre: "Ascensión del Señor (trasladado)" },
  { fecha: "2026-06-08", nombre: "Corpus Christi (trasladado)" },
  { fecha: "2026-06-15", nombre: "Sagrado Corazón" },
  { fecha: "2026-06-29", nombre: "San Pedro y San Pablo (trasladado)" },
  { fecha: "2026-07-20", nombre: "Independencia de Colombia" },
  { fecha: "2026-08-07", nombre: "Batalla de Boyacá" },
  { fecha: "2026-08-17", nombre: "Asunción de la Virgen (trasladado)" },
  { fecha: "2026-10-12", nombre: "Día de la Raza" },
  { fecha: "2026-11-02", nombre: "Todos los Santos (trasladado)" },
  { fecha: "2026-11-16", nombre: "Independencia de Cartagena (trasladado)" },
  { fecha: "2026-12-08", nombre: "Inmaculada Concepción" },
  { fecha: "2026-12-25", nombre: "Navidad" },
];

// Helpers para placeholders
function isPostgres() {
  return !!db._pool;
}
function ph(i) {
  return isPostgres() ? `$${i}` : `?`;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err, r) => {
      if (err) reject(err);
      else resolve(r);
    });
  });
}

async function main() {
  const country = "CO";

  try {
    // Insert "idempotente"
    if (isPostgres()) {
      for (const h of HOLIDAYS_2026_CO) {
        await run(
          `INSERT INTO holidays (country, fecha, nombre)
           VALUES (${ph(1)}, ${ph(2)}, ${ph(3)})
           ON CONFLICT (country, fecha) DO NOTHING;`,
          [country, h.fecha, h.nombre]
        );
      }
    } else {
      for (const h of HOLIDAYS_2026_CO) {
        await run(
          `INSERT OR IGNORE INTO holidays (country, fecha, nombre)
           VALUES (${ph(1)}, ${ph(2)}, ${ph(3)});`,
          [country, h.fecha, h.nombre]
        );
      }
    }

    console.log("✅ Festivos CO 2026 cargados en holidays (si ya existían, se ignoraron).");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error cargando festivos:", e);
    process.exit(1);
  }
}

main();
