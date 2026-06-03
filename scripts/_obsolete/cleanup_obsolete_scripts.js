const fs = require("fs");
const path = require("path");

// ===============================
// LISTA DE SCRIPTS OBSOLETOS
// ===============================
const obsoleteFiles = [
  // raíz
  "seedMunicipios.js",
  "seed_complete_municipalities.js",
  "sync_all.js",
  "updateMunicipalitiesFromCSV.js",
  "rebuildMunicipalities.js",
  "fixMunicipalitiesConstraint.js",
  "fixMunicipiosConstraint.js",
  "cleanDuplicates.js",
  "countMunicipalities.js",
  "checkMunicipios.js",
  "checkMunicipalitiesSchema.js",
  "checkColumns.js",
  "checkTables.js",
  "detectMissingMunicipalities.js",
  "fixMunicipalitiesConstraint.js",
  "inspect.js",
  "inspect-holidays.js",
  "limpiar.js",

  // scripts/
  "scripts/merge_municipalities_full.js",
  "scripts/load_municipalities_full.js",
  "scripts/fill_municipalities_full.js",
  "scripts/update_municipalities_full.js",
  "scripts/importMunicipalities.js",
  "scripts/importar_municipios_csv.js",
  "scripts/fixCodigoDanePadding.js",
  "scripts/fixMunicipalitiesTypes.js",
  "scripts/limpiar_municipios.py",
  "scripts/validar_municipios.py",
  "scripts/diagnostico_municipios.py",
  "scripts/upgradeMunicipalitiesSchema.js",
  "scripts/migrate_municipalities_profile.js",
  "scripts/seed_municipalities_antioquia_from_tsv.js",
  "scripts/seedPilot32.js",
  "scripts/importFestivalsMaster.js",
  "scripts/transformRawFestivalsToMaster.js",
  "scripts/mark_festivals_base.js",
  "scripts/prioritize_real_festivals.js",
];

// ===============================
// DELETE
// ===============================
const baseDir = path.join(__dirname, "..");

let deleted = 0;
let notFound = 0;

obsoleteFiles.forEach((file) => {
  const filePath = path.join(baseDir, file);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log("🗑️ Eliminado:", file);
    deleted++;
  } else {
    notFound++;
  }
});

console.log("\n✅ Limpieza finalizada");
console.log("Eliminados:", deleted);
console.log("No encontrados:", notFound);