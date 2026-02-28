const path = require("path");
const db = require("../db");

function hasColumn(table, column) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.some((r) => r.name === column));
    });
  });
}

function run(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, [], (err) => (err ? reject(err) : resolve()));
  });
}

async function addColumnIfMissing(table, col, typeSql) {
  const exists = await hasColumn(table, col);
  if (exists) {
    console.log(`✓ ${table}.${col} ya existe`);
    return;
  }
  const sql = `ALTER TABLE ${table} ADD COLUMN ${col} ${typeSql}`;
  await run(sql);
  console.log(`+ Agregada columna: ${table}.${col}`);
}

(async () => {
  try {
    console.log("== Migración municipalities (perfil) ==");

    await addColumnIfMissing("municipalities", "subregion", "TEXT");
    await addColumnIfMissing("municipalities", "altitud_msnm", "INTEGER");
    await addColumnIfMissing("municipalities", "temperatura_prom", "REAL");
    await addColumnIfMissing("municipalities", "area_km2", "REAL");
    await addColumnIfMissing("municipalities", "habitantes", "INTEGER");
    await addColumnIfMissing("municipalities", "fundacion", "INTEGER");
    await addColumnIfMissing("municipalities", "bandera_url", "TEXT");

    console.log("✅ Migración lista.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error migración:", e.message);
    process.exit(1);
  }
})();
