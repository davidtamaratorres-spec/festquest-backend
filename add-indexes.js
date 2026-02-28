const db = require("./db");

// Ejecuta sentencias en serie
function run(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

(async () => {
  try {
    console.log("➡️ Creando índices...");

    // festivals
    await run(`CREATE INDEX IF NOT EXISTS idx_festivals_municipio_id ON festivals(municipio_id);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_festivals_fecha_inicio ON festivals(fecha_inicio);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_festivals_fecha_fin ON festivals(fecha_fin);`);

    // municipalities
    await run(`CREATE INDEX IF NOT EXISTS idx_municipalities_departamento ON municipalities(departamento);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_municipalities_nombre ON municipalities(nombre);`);

    // holidays
    await run(`CREATE INDEX IF NOT EXISTS idx_holidays_fecha ON holidays(fecha);`);
    await run(`CREATE INDEX IF NOT EXISTS idx_holidays_country_fecha ON holidays(country, fecha);`);

    console.log("✅ Índices creados/ya existían.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error creando índices:", e.message);
    process.exit(1);
  }
})();
