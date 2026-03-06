const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({ 
    mensaje: "ESTOY LEYENDO EL ARCHIVO CORRECTO",
    timestamp: new Date().getTime() 
  });
});

// Comenta lo demás un segundo
// const db = require("./db"); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Test activo"));