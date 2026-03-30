const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "..", "alcaldes_colombia.csv");
const OUTPUT = path.join(__dirname, "..", "alcaldes_con_correos.csv");

function limpiar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const lineas = fs.readFileSync(INPUT, "utf-8").split("\n");

const header = lineas[0];
const resultado = [header];

for (let i = 1; i < lineas.length; i++) {
  const line = lineas[i];
  if (!line.trim()) continue;

  const partes = line.split(",");

  const codigo = partes[0];
  const departamento = partes[1];
  const municipio = partes[2];

  const base = limpiar(municipio);

  const correo = base
    ? `alcaldia@${base}.gov.co`
    : "";

  resultado.push(
    `${codigo},${departamento},${municipio},,${correo}`
  );
}

fs.writeFileSync(OUTPUT, resultado.join("\n"), "utf-8");

console.log("✅ Archivo generado: alcaldes_con_correos.csv");