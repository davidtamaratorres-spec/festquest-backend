const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const filePath = path.join(__dirname, "data", "datos_nacionales.csv");

let count = 0;
let withPlaces = 0;

fs.createReadStream(filePath)
  .pipe(csv())
  .on("data", (row) => {
    count++;

    if (
      (row.sitio_1 && row.sitio_1.trim() !== "") ||
      (row.sitio_2 && row.sitio_2.trim() !== "") ||
      (row.sitio_3 && row.sitio_3.trim() !== "")
    ) {
      withPlaces++;
    }
  })
  .on("end", () => {
    console.log("Filas totales:", count);
    console.log("Filas con lugares:", withPlaces);
  });