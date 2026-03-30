const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const inputPath = path.join(__dirname, "..", "data", "master_alimentacion.csv");

const municipiosMap = new Map();
const festivales = [];

fs.createReadStream(inputPath)
  .pipe(csv())
  .on("data", (row) => {
    const codigo = String(row.codigo_dane).padStart(5, "0");

    // MUNICIPIOS (únicos)
    if (!municipiosMap.has(codigo)) {
      municipiosMap.set(codigo, {
        codigo_dane: codigo,
        departamento: row.departamento,
        municipio: row.municipio,
        subregion: row.subregion,
        habitantes: row.habitantes,
        temperatura_promedio: row.temperatura_promedio,
        altura: row.altura,
        gentilicio: row.gentilicio,
        bandera_url: row.bandera_url,
        alcalde: row.alcalde,
        correo_alcalde: row.correo_alcalde,
      });
    }

    // FESTIVALES (todos)
    if (row.festival && row.fecha) {
      festivales.push({
        codigo_dane: codigo,
        departamento: row.departamento,
        municipio: row.municipio,
        festival: row.festival,
        fecha: row.fecha,
        descripcion_festival: row.descripcion_festival,
        significado_festival: row.significado_festival,
        sitio_1: row.sitio_1,
        maps_1: row.maps_1,
        sitio_2: row.sitio_2,
        maps_2: row.maps_2,
        sitio_3: row.sitio_3,
        maps_3: row.maps_3,
        hotel_1: row.hotel_1,
        wa_1: row.wa_1,
        hotel_2: row.hotel_2,
        wa_2: row.wa_2,
        hotel_3: row.hotel_3,
        wa_3: row.wa_3,
      });
    }
  })
  .on("end", () => {
    // ===== MUNICIPIOS =====
    const municipios = Array.from(municipiosMap.values());

    const municipiosHeader = Object.keys(municipios[0]).join(",");
    const municipiosRows = municipios.map(obj => Object.values(obj).join(","));

    fs.writeFileSync(
      path.join(__dirname, "..", "data", "municipios.csv"),
      [municipiosHeader, ...municipiosRows].join("\n")
    );

    // ===== FESTIVALES =====
    const festivalesHeader = Object.keys(festivales[0]).join(",");
    const festivalesRows = festivales.map(obj => Object.values(obj).join(","));

    fs.writeFileSync(
      path.join(__dirname, "..", "data", "festivales.csv"),
      [festivalesHeader, ...festivalesRows].join("\n")
    );

    console.log("✅ municipios.csv generado:", municipios.length);
    console.log("✅ festivales.csv generado:", festivales.length);
  });